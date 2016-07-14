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

  loadConfig () {
    let configPath = path.resolve(path.join(this.hookPath, 'config'))
    HookBuilder.logLoadObject(this, 'Configs', configPath)
    try {
      let configModules = requireAll({
        dirname: configPath,
        filter: /(.+)\.js$/
      })
      let sailsConfig = R.reduce(R.merge, {}, R.values(configModules))
      // CURSE YOUR LODASH
      _.defaultsDeep(this.sails.config, sailsConfig)
    } catch (e) {
      HookBuilder.errLoadObject(this, 'Configs', e)
    }
  }

  loadModels () {
    let modelsPath = path.resolve(path.join(this.hookPath, 'api', 'models'))
    HookBuilder.logLoadObject(this, 'Models', modelsPath)
    try {
      let models = requireAll({
        dirname: modelsPath,
        filter: /(.+)\.js$/
      })
      this.mergeEntities('models', models)
    } catch (e) {
      HookBuilder.errLoadObject(this, 'Models', e)
    }
  }

  loadPolicies () {
    let policiesPath = path.resolve(path.join(this.hookPath, 'api', 'policies'))
    HookBuilder.logLoadObject(this, 'Policies', policiesPath)
    try {
      let policies = requireAll({
        dirname: path.resolve(path.join(this.hookPath, 'api', 'policies')),
        filter: /(.+)\.js$/
      })

      let objP = {}
      R.forEach(key => {
        objP[R.toLower(key)] = policies[key]
      }, R.keys(policies))

      // CURSE YOUR LODASH
      _.extend(this.sails.hooks.policies.middleware, objP)
    } catch (e) {
      HookBuilder.errLoadObject(this, 'Policies', e)
    }
  }

  loadControllers () {
    let controllersPath = path.resolve(path.join(this.hookPath, 'api', 'controllers'))
    HookBuilder.logLoadObject(this, 'Controllers', controllersPath)
    try {
      let controllers = requireAll({
        dirname: controllersPath,
        filter: /(.+Controller)\.js$/,
        map (name, path) {
          return name.replace(/Controller/, '')
        }
      })
      this.mergeEntities('controllers', controllers)
    } catch (e) {
      HookBuilder.errLoadObject(this, 'Controllers', e)
    }
  }

  loadServices () {
    let servicesPath = path.resolve(path.join(this.hookPath, 'api', 'services'))
    HookBuilder.logLoadObject(this, 'Services', servicesPath)
    try {
      let services = requireAll({
        dirname: servicesPath,
        filter: /(.+)\.js$/
      })
      this.mergeEntities('services', services)
    } catch (e) {
      HookBuilder.errLoadObject(this, 'Services', e)
    }
  }

  /**
   * load modules into the sails namespace
   */
  mergeEntities (ns, entities) {
    // CURSE YOUR LODASH
    this.sails[ns] = _.merge(this.sails[ns] || { }, HookBuilder.transformEntities(entities))
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
    hook.sails.log.silly(`HookBuilder (${hook.name}): loading ${objStr} '${path}'`)
  }

  static errLoadObject (hook, objStr, err) {
    hook.sails.log.warn(`HookBuilder (${hook.name}): error loading ${objStr}.\n${err.stack}`)
  }

  static defaultConfig () {
    return {
      waitLogger: true,
      config: true,
      controllers: true,
      models: true,
      policies: true,
      services: true
    }
  }

  static configureHook (builderCfg, hook) {
    if (builderCfg.config) {
      hook.loadConfig(hook.constructor.name)
    }

    if (builderCfg.services) {
      hook.loadServices()
    }

    if (builderCfg.models) {
      hook.loadModels()
    }

    if (builderCfg.controllers) {
      hook.loadControllers()
    }

    if (builderCfg.policies) {
      hook.loadPolicies()
    }

    hook.configure()

    sails.emit(`hook:${hook.name}:configured`)
  }

  /**
   * Return a bona fide Sails hook object forged from the
   * specified class
   *
   * @param Class Hook
   */
  static exportHook (Hook) {
    return sails => {
      const hook = new Hook(sails)

      let builderCfg = hook.hookBuilder
      if (R.isNil(builderCfg)) {
        builderCfg = {}
      }

      if (builderCfg === false) {
        builderCfg = {
          waitLogger: false,
          config: false,
          controllers: false,
          models: false,
          policies: false,
          services: false
        }
      }

      builderCfg = R.merge(HookBuilder.defaultConfig(), builderCfg)

      // this.sails.log.debug(`HookBuilder (${this.name}): hookPath - ${this.hookPath}`))

      return {
        name: hook.name,
        routes: hook.routes(),
        defaults (overrides) {
          return R.merge(hook.defaults(overrides), {})
        },
        configure () {
          if (builderCfg.waitLogger) {
            sails.after('hook:logger:loaded', () => HookBuilder.configureHook(builderCfg, hook))
          } else {
            HookBuilder.configureHook(builderCfg, hook)
          }
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
