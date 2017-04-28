const R = require('ramda')
const lib = require('./lib')
const Promise = require('bluebird')

var defFunctions = [
  'find',
  'findOne',
  'create',
  'update',
  'destroy',
  'populate'
]

var falsyArr = [false, null, 0, '', undefined, NaN]

function noFalsy (l) {
  return R.filter(x => !R.contains(x, falsyArr), l)
}

function getFunctions (objects) {
  if (R.isNil(objects)) {
    return []
  }
  let props = R.keys(objects)
  return R.filter(key => R.is(Function, objects[key]), props)
}

var permissionPolicies = [
  'TokenAuth',
  // 'ModelPolicy',
  // 'OwnerPolicy',
  'ControllerPolicy',
  'PermissionPolicy'
  // 'RolePolicy'
]

class Waterauth extends lib.HookBuilder {
  constructor (sails) {
    super(sails, module)
    sails.utils = lib.utils
  }

  configure () {
    lib.passport.loadStrategies()
    .catch(this.sails.log.error)

    if (!R.is(Object, this.sails.config.waterauth)) {
      this.sails.config.waterauth = {}
    }

    let connName = this.sails.config.waterauth.modelConnectionName
    if (!(R.isNil(connName) || R.isEmpty(connName))) {
      this.sails.log.debug(`Waterauth is using the connection '${connName}'`)
      R.forEach(key => {
        let model = this.sails.models[key]
        model.connection = connName
      }, this._builder.models)
    }

    if (this.sails.config.waterauth.local && this.sails.config.waterauth.local.verifyEmail) {
      if (!this.sails.hooks.email) {
        throw new Error("'sails-hook-email' required for email verification.")
      }
    }

    if (this.sails.config.waterauth.local && this.sails.config.waterauth.local.resetEmail) {
      if (!this.sails.hooks.email) {
        throw new Error("'sails-hook-email' required for password reset by email.")
      }
    }

    /**
     * Local cache of Model name -> id mappings to avoid excessive database lookups.
     */
    // this.sails.config.blueprints.populate = false
  }

  initialize (next) {
    // let config = this.sails.config.waterauth

    // this.installModelOwnership()

    if (!this.validatePolicyConfig()) {
      this.sails.log.warn('One or more required policies are missing.')
      console.log(R.difference(permissionPolicies, this.sails.config.policies['*']))
    }

    this.sails.after('hook:orm:loaded', () => {
      this.syncModelIndicies()
      .then(() => this.syncModels())
      .then(() => this.syncControllers())
      .then(() => this.updateRoles())
      .then(() => this.createUpdateAdmin())
      .then(() => this.initializePermissions())
      .then(() => {
        this.sails.log.verbose('Waterauth setup complete')
        next()
      })
      .catch(err => {
        this.sails.log.error('Waterauth error during init')
        this.sails.log.error(err)
        return next(err)
      })
    })
  }

  validatePolicyConfig () {
    let policies = this.sails.config.policies
    return R.all(R.identity, [
      R.is(Array, policies['*']),
      R.intersection(permissionPolicies, policies['*']).length === permissionPolicies.length,
      policies.AuthController && R.is(Object, policies.AuthController) && R.contains('PassportPolicy', policies.AuthController['*'])
    ])
  }

  syncModelIndicies () {
    if (!this.sails.config.waterauth.enforceIndex) {
      return Promise.resolve()
    }
    sails.log.verbose('waterauth is ensuring model indicies exist')

    let wAuthModels = this._builder.models
    return lib.models.runIndexCheck(wAuthModels)
  }

  syncModels () {
    sails.log.verbose('Waterauth is syncing waterline models..')

    let models = noFalsy(R.map(model => {
      return model && model.globalId && model.identity && {
        name: model.globalId,
        identity: model.identity,
        attributes: R.omit(model.attributes, getFunctions(model.attributes))
      }
    }, R.values(sails.models)))

    var modelPromises = R.map(model => {
      return sails.models.model.findOrCreate({
        name: model.name
      }, model)
    }, R.values(models))

    return Promise.all(modelPromises)
    .then(models2 => {
      this.models = models2
      let mCache = R.indexBy(R.prop('identity'), models2)
      this.sails.hooks.waterauth._modelCache = mCache
    })
  }

  syncControllers () {
    sails.log.verbose('Waterauth is now syncing waterline controllers...')

    let controllers = noFalsy(R.map(controller => {
      let funcs = getFunctions(controller)

      if (R.find(R.propEq('identity', controller.identity), this.models)) {
        funcs = R.map(R.toLower, R.uniq(R.concat(defFunctions, funcs)))
      }
      // console.log(fixList(funcs, defFunctions))
      return controller && controller.globalId && controller.identity && {
        name: controller.globalId,
        identity: controller.identity,
        functions: funcs
      }
    }, R.values(sails.controllers)))

    return Promise.all(R.map(controller => {
      return sails.models.controller.findOrCreate({
        name: controller.name
      }, controller)
      .then(ctrl => {
        if (R.difference(controller.functions, ctrl.functions).length !== 0 ||
          R.difference(ctrl.functions, controller.functions).length !== 0) {
          ctrl.functions = controller.functions
          return ctrl.save()
          .then(() => ctrl)
        }
        return ctrl
      })
    }, R.values(controllers)))
    .then(controllers2 => {
      this.controllers = controllers2
      this.sails.hooks.waterauth._controllerCache = R.indexBy(R.prop('identity'), controllers2)
    })
  }

  updateRoles () {
    sails.log.verbose('waterauth moved on to updating permission roles...')

    return Promise.all([
      this.sails.models.role.findOrCreate({ name: 'root' }, { name: 'root' }),
      this.sails.models.role.findOrCreate({ name: 'admin' }, { name: 'admin' }),
      this.sails.models.role.findOrCreate({ name: 'registered' }, { name: 'registered' }),
      this.sails.models.role.findOrCreate({ name: 'public' }, { name: 'public' })
    ])
    .then(roles => {
      this.roles = roles
    })
  }

  createUpdateAdmin () {
    sails.log.verbose('Waterauth is updating the admin user')

    // let userModel = R.find(R.propEq('name', 'User'), this.models)
    let keys = ['adminUsername', 'adminPassword', 'adminEmail']
    let hasKeys = R.all(R.identity, R.map(key => !R.isNil(sails.config.waterauth[key]), keys))
    if (!hasKeys) {
      throw new Error('Missing auth config requirement')
    }

    return sails.models.user.findOne({ email: sails.config.waterauth.adminEmail })
    .then(user => {
      if (user) {
        return user
      }

      sails.log.info('waterauth: admin user does not exist creating...')
      return sails.models.user.register({
        username: sails.config.waterauth.adminUsername,
        password: sails.config.waterauth.adminPassword,
        email: sails.config.waterauth.adminEmail,
        firstName: sails.config.waterauth.adminFirstName || 'Admin',
        lastname: sails.config.waterauth.adminLastName || 'McAdminFace',
        roles: [ R.find(R.propEq('name', 'root'), this.roles).id ]
        // createdBy: 1,
        // owner: 1,
        // model: userModel.id
      })
    })
  }

  createUpdateDefaultRoles () {
    sails.log.verbose('Waterauth is creating the default roles')
  }

  initializePermissions () {
    sails.log.verbose('Waterauth is finally setting up permissions...')
    return lib.permission.create(this.roles, this.controllers, this.sails.config.waterauth)
    .then(() => {
      sails.log.verbose('Waterauth is creating the default roles')
      // return lib.permission.createDefaultRoles(lib.roleConfig, this.controllers)
    })
  }
}

module.exports = lib.HookBuilder.exportHook(Waterauth)
