'use strict'

const requireAll = require('require-all')
const path = require('path')
const R = require('ramda')
const _ = require('lodash')

class HookBuilder {

  constructor (sails, hookModule) {
    this.sails = sails
    this.name = this.constructor.name.toLowerCase()
    this.hookPath = path.resolve(path.dirname(hookModule.filename))
    this._builder = {}
  }

  configure () {
    return {}
  }

  initialize (next) {
    next()
  }

  routes () {
    return {}
  }

  defaults (overrides) {
    return {}
  }

  /**
   * load modules into the sails namespace
   */
  static mergeEntities (hook, ns, entities) {
    // CURSE YOUR LODASH
    hook.sails[ns] = _.merge(hook.sails[ns] || { }, HookBuilder.transformEntities(entities))
  }

  static loadObjects ({
    hook, type,
    filter = /(.+)\.js$/,
    map = null,
    objectsPath = null,
    cb = HookBuilder.mergeEntities
  }) {
    let objectCapCase = R.toUpper(type[0]) + R.tail(type)
    if (R.isNil(objectsPath)) {
      objectsPath = path.resolve(path.join(hook.hookPath, 'api', type))
    }

    // HookBuilder.logLoadObject(hook, objectCapCase, objectsPath)
    try {
      let reqAllOpts = {
        dirname: objectsPath,
        filter: filter
      }

      if (!R.isNil(map)) {
        reqAllOpts.map = map
      }

      let objects = requireAll(reqAllOpts)
      return cb(hook, type, objects)
    } catch (e) {
      HookBuilder.errLoadObject(hook, objectCapCase, e)
    }
  }

  static transformEntities (entities) {
    let obj = {}
    R.forEach(key => {
      let lower = R.toLower(key)
      obj[lower] = R.merge({
        globalId: key,
        identity: lower
      }, entities[key])
    }, R.keys(entities))

    return obj
  }

  static logLoadObject (hook, objStr, path) {
    hook.sails.log.debug(`HookBuilder (${hook.name}): loading ${objStr} '${path}'`)
  }

  static errLoadObject (hook, objStr, err) {
    hook.sails.log.warn(`HookBuilder (${hook.name}): error loading ${objStr}.\n${err.stack}`)
  }

  static defaultConfig () {
    return {
      config: true,
      controllers: true,
      models: true,
      policies: true,
      services: true
    }
  }

  /**
   * Return a bona fide Sails hook object forged from the
   * specified class
   *
   * @param Class Hook
   */
  static exportHook (Hook) {
    return sails => {
      let hook = new Hook(sails)

      hook.sails.log.debug(`HookBuilder (${hook.name}): Hook Path - ${hook.hookPath}`)

      let builderCfg = hook.hookBuilder
      if (R.isNil(builderCfg)) {
        builderCfg = HookBuilder.defaultConfig()
      }

      if (builderCfg === false) {
        builderCfg = {
          config: false,
          controllers: false,
          models: false,
          policies: false,
          services: false
        }
      }

      builderCfg = R.merge(HookBuilder.defaultConfig(), builderCfg)

      if (builderCfg.config) {
        HookBuilder.loadObjects({
          hook,
          type: 'configs',
          objectsPath: path.resolve(path.join(hook.hookPath, 'config')),
          cb: (h, ns, configModules) => {
            let sailsConfig = R.reduce(R.merge, {}, R.values(configModules))
            // CURSE YOUR LODASH
            _.defaultsDeep(hook.sails.config, sailsConfig)
          }
        })
      }

      hook._builder = {}

      let getLowerKeys = R.compose(R.map(R.toLower), R.keys)

      return {
        name: hook.name,
        routes: hook.routes(),
        defaults (overrides) {
          return R.merge(hook.defaults(overrides), {})
        },
        configure () {
          if (builderCfg.services) {
            HookBuilder.loadObjects({
              hook,
              type: 'services',
              cb: (h, ns, services) => {
                hook._builder.services = getLowerKeys(services)
                HookBuilder.mergeEntities(h, ns, services)
              }
            })
          }

          if (builderCfg.models) {
            HookBuilder.loadObjects({
              hook,
              type: 'models',
              cb: (h, ns, models) => {
                hook._builder.models = getLowerKeys(models)
                HookBuilder.mergeEntities(h, ns, models)
              }
            })
          }

          if (builderCfg.controllers) {
            HookBuilder.loadObjects({
              hook,
              type: 'controllers',
              filter: /(.+Controller)\.js$/,
              map: (name, path) => R.replace(/(?!^)Controller/, '', name),
              cb: (h, ns, controllers) => {
                hook._builder.policies = getLowerKeys(controllers)
                HookBuilder.mergeEntities(h, ns, controllers)
              }
            })
          }

          if (builderCfg.policies) {
            HookBuilder.loadObjects({
              hook,
              type: 'policies',
              cb: (h, ns, policies) => {
                let objP = {}
                R.forEach(key => {
                  objP[R.toLower(key)] = policies[key]
                }, R.keys(policies))

                hook._builder.policies = getLowerKeys(objP)
                // CURSE YOUR LODASH
                _.extend(hook.sails.hooks.policies.middleware, objP)
              }
            })
          }

          hook.configure()

          sails.emit(`hook:${hook.name}:configured`)
        },
        initialize (next) {
          hook.initialize(() => {
            sails.emit(`hook:${hook.name}:initialized`)
            next()
          })
        }
      }
    }
  }
}

module.exports = HookBuilder
