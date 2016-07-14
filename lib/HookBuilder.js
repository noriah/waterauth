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

  // loadConfig () {
  //   let configPath = path.resolve(path.join(this.hookPath, 'config'))
  //   HookBuilder.logLoadObject(this, 'Configs', configPath)
  //   try {
  //     let configModules = requireAll({
  //       dirname: configPath,
  //       filter: /(.+)\.js$/
  //     })
  //     let sailsConfig = R.reduce(R.merge, {}, R.values(configModules))
  //     // CURSE YOUR LODASH
  //     _.defaultsDeep(this.sails.config, sailsConfig)
  //   } catch (e) {
  //     HookBuilder.errLoadObject(this, 'Configs', e)
  //   }

  // }

  // loadModels () {
  //   // let modelsPath = path.resolve(path.join(this.hookPath, 'api', 'models'))
  //   // HookBuilder.logLoadObject(this, 'Models', modelsPath)
  //   // try {
  //   //   let models = requireAll({
  //   //     dirname: modelsPath,
  //   //     filter: /(.+)\.js$/
  //   //   })
  //   //   this.mergeEntities('models', models)
  //   // } catch (e) {
  //   //   HookBuilder.errLoadObject(this, 'Models', e)
  //   // }
  //   HookBuilder.loadObjects(this, 'models')
  // }

  // loadPolicies () {
  //   let policiesPath = path.resolve(path.join(this.hookPath, 'api', 'policies'))
  //   HookBuilder.logLoadObject(this, 'Policies', policiesPath)
  //   try {
  //     let policies = requireAll({
  //       dirname: path.resolve(path.join(this.hookPath, 'api', 'policies')),
  //       filter: /(.+)\.js$/
  //     })

  //     let objP = {}
  //     R.forEach(key => {
  //       objP[R.toLower(key)] = policies[key]
  //     }, R.keys(policies))

  //     // CURSE YOUR LODASH
  //     _.extend(this.sails.hooks.policies.middleware, objP)
  //   } catch (e) {
  //     HookBuilder.errLoadObject(this, 'Policies', e)
  //   }
  // }

  // loadControllers () {
  //   // let controllersPath = path.resolve(path.join(this.hookPath, 'api', 'controllers'))
  //   // HookBuilder.logLoadObject(this, 'Controllers', controllersPath)
  //   // try {
  //   //   let controllers = requireAll({
  //   //     dirname: controllersPath,
  //   //     filter: /(.+Controller)\.js$/,
  //   //     map (name, path) {
  //   //       return name.replace(/Controller/, '')
  //   //     }
  //   //   })
  //   //   HookBuilder.mergeEntities(this, 'controllers', controllers)
  //   // } catch (e) {
  //   //   HookBuilder.errLoadObject(this, 'Controllers', e)
  //   // }

  //   HookBuilder.loadObjects(this, 'controllers',
  //     /(.+Controller)\.js$/,
  //     (name, path) => name.replace(/Controller/, ''))
  // }

  // loadServices () {
  //   // let servicesPath = path.resolve(path.join(this.hookPath, 'api', 'services'))
  //   // HookBuilder.logLoadObject(this, 'Services', servicesPath)
  //   // try {
  //   //   let services = requireAll({
  //   //     dirname: servicesPath,
  //   //     filter: /(.+)\.js$/
  //   //   })
  //   //   this.mergeEntities('services', services)
  //   // } catch (e) {
  //   //   HookBuilder.errLoadObject(this, 'Services', e)
  //   // }
  //   HookBuilder.loadObjects(this, 'services')
  // }

  /**
   * load modules into the sails namespace
   */
  static mergeEntities (hook, ns, entities) {
    // CURSE YOUR LODASH
    hook.sails[ns] = _.merge(hook.sails[ns] || { }, HookBuilder.transformEntities(entities))
  }

  static loadObjects ({
    hook, type,
    nextAction = HookBuilder.mergeEntities,
    filter = /(.+)\.js$/,
    map = null,
    objectsPath = null
  }) {
    let objectCapCase = R.toUpper(type[0]) + R.tail(type)
    if (R.isNil(objectsPath)) {
      objectsPath = path.resolve(path.join(hook.hookPath, 'api', type))
    }

    HookBuilder.logLoadObject(hook, objectCapCase, objectsPath)
    try {
      let reqAllOpts = {
        dirname: objectsPath,
        filter: filter
      }

      if (!R.isNil(map)) {
        reqAllOpts.map = map
      }

      let objects = requireAll(reqAllOpts)
      nextAction(hook, type, objects)
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
          nextAction: (h, ns, configModules) => {
            let sailsConfig = R.reduce(R.merge, {}, R.values(configModules))
            // CURSE YOUR LODASH
            _.defaultsDeep(hook.sails.config, sailsConfig)
          }
        })
        // hook.loadConfig(Hook.constructor.name)
      }

      // hook.builderCfg = builderCfg

      return {
        name: hook.name,
        routes: hook.routes(),
        defaults (overrides) {
          return R.merge(hook.defaults(overrides), {})
        },
        configure () {
          if (builderCfg.services) {
            HookBuilder.loadObjects({hook, type: 'services'})
          }

          if (builderCfg.models) {
            HookBuilder.loadObjects({hook, type: 'models'})
          }

          if (builderCfg.controllers) {
            HookBuilder.loadObjects({
              hook,
              type: 'controllers',
              filter: /(.+Controller)\.js$/,
              map: (name, path) => name.replace(/Controller/, '')
            })
          }

          if (builderCfg.policies) {
            HookBuilder.loadObjects({
              hook,
              type: 'policies',
              nextAction: (h, ns, policies) => {
                let objP = {}
                R.forEach(key => {
                  objP[R.toLower(key)] = policies[key]
                }, R.keys(policies))

                // CURSE YOUR LODASH
                _.extend(hook.sails.hooks.policies.middleware, objP)
              }
            })
            // hook.loadPolicies()
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
