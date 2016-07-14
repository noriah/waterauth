var path = require('path')
var R = require('ramda')

var HookBuilder = require('./lib/HookBuilder.js')

var defFunctions = [
  'find',
  'findOne',
  'create',
  'update',
  'destroy'
]


var R = require('ramda')

R.pathGet = function pathGet (path, obj) {
  if (!R.is(Array, path)) {
    if (!R.is(String, path)) {
      return null
    }
    path = R.split('.', path)
  }

  return R.path(path, obj)
}

R.pathHas = function pathHas (path, obj) {
  if (!R.is(Array, path)) {
    if (!R.is(String, path)) {
      return null
    }
    path = R.split('.', path)
  }

  return R.pathSatisfies(x => !R.isNil(x), path, obj)
}

var falsyArr = [false, null, 0, '', undefined, NaN]

R.noFalsy = R.filter(x => !R.contains(x, falsyArr))

var baseFunctions = function baseFunctions (object, props) {
  if (R.isNil(props)) {
    props = R.keys(object)
  }
  return R.filter(key => R.is(Function, object[key]), props)
}

R.functions = function functions (object) {
  return object === null ? [] : baseFunctions(object)
}

var permissionPolicies = [
  'TokenAuth',
  'ModelPolicy',
  // 'OwnerPolicy',
  'PermissionPolicy',
  'RolePolicy'
]

class TotalAuth extends HookBuilder {

  constructor (sails) {
    super(sails, module)
  }

  configure () {
    this.sails.services.passportservice.loadStrategies()

    if (!R.is(Object, this.sails.config.auth)) {
      this.sails.config.auth = {}
    }

    /**
     * Local cache of Model name -> id mappings to avoid excessive database lookups.
     */
    this.sails.config.blueprints.populate = false
  }

  initialize (next) {
    // let config = this.sails.config.auth

    // this.installModelOwnership()

    if (!this.validatePolicyConfig()) {
      this.sails.log.warn('One or more required policies are missing.')
      this.sails.log.warn('Please see README for installation instructions: https://github.com/tjwebb/sails-permissions')
    }

    this.sails.after('hook:orm:loaded', () => {
      this.syncModels()
      .then(() => this.syncControllers())
      .then(() => this.updateRoles())
      .then(() => this.createUpdateAdmin())
      .then(() => this.initializePermissions())
      .then(() => next())
      .catch(err => {
        this.sails.log.error(err)
        sentry.catptureExcpeiton(err)
        next(err)
      })
    })
  }

  validatePolicyConfig () {
    var policies = this.sails.config.policies
    return R.all(R.identity, [
      R.is(Array, policies['*']),
      R.intersection(permissionPolicies, policies['*']).length === permissionPolicies.length,
      policies.AuthController && R.contains('PassportPolicy', policies.AuthController['*'])
    ])
  }

  // installModelOwnership () {
  //   if (this.sails.config.models.autoCreatedBy === false) {
  //     return
  //   }

  //   R.forEach(key => {
  //     var model = this.sails.models[key]
  //     if (model.autoCreatedBy === false) {
  //       return
  //     }

  //     model.attributes = R.merge({
  //       createdBy: {
  //         model: 'user',
  //         index: true
  //       },
  //       owner: {
  //         model: 'user',
  //         index: true
  //       }
  //     }, model.attributes)
  //   }, R.keys(this.sails.models))
  // }

  syncModels () {
    sails.log.verbose('sails-permissions: syncing waterline models')

    var models = R.noFalsy(R.map(model => {
      return model && model.globalId && model.identity && {
        name: model.globalId,
        identity: model.identity,
        attributes: R.omit(model.attributes, R.functions(model.attributes))
      }
    }, R.values(sails.models)))

    return Promise.all(R.map(model => {
      return sails.models.model.findOrCreate({
        name: model.name
      }, model)
    }, R.values(models)))
    .then(models2 => {
      this.models = models2
      this.sails.hooks.auth._modelCache = R.indexBy(R.prop('identity'), models2)
    })
  }

  syncControllers () {
    sails.log.verbose('sails-permissions: syncing waterline controllers')

    var controllers = R.noFalsy(R.map(controller => {
      var funcs = R.functions(controller)

      if (R.find(R.propEq('identity', controller.identity), this.models)) {
        funcs = R.uniq(R.concat(defFunctions, funcs))
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
    }, R.values(controllers)))
    .then(controllers2 => {
      this.controllers = controllers2
      this.sails.hooks.auth._controllerCache = R.indexBy(R.prop('identity'), controllers2)
    })
  }

  updateRoles () {
    sails.log.verbose('sails-permissions: updating permission roles')

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
    sails.log.verbose('sails-permissions: updating admin user')

    var userModel = R.find(R.propEq('name', 'User'), this.models)
    var keys = ['adminUsername', 'adminPassword', 'adminEmail']
    var hasKeys = R.all(R.identity, R.map(key => !R.isNil(sails.config.auth[key]), keys))
    if (!hasKeys) {
      throw new Error('Missing auth config requirement')
    }

    return sails.models.user.findOne({ username: sails.config.auth.adminUsername })
    .then(user => {
      if (user) {
        return user
      }

      sails.log.info('sails-permissions: admin user does not exist creating...')
      return sails.models.user.register({
        username: sails.config.auth.adminUsername,
        password: sails.config.auth.adminPassword,
        email: sails.config.auth.adminEmail,
        firstName: sails.config.auth.adminFirstName || 'Admin',
        lastname: sails.config.auth.adminLastName || 'McAdminFace',
        roles: [ R.find(R.propEq('name', 'admin'), this.roles).id ],
        // createdBy: 1,
        // owner: 1,
        model: userModel.id
      })
    })
  }

  initializePermissions () {
    sails.log.verbose('sails-permissions: setting up permissions')

    return this.sails.models.user.findOne({
      username: this.sails.config.auth.adminUsername
    })
    // .then(user => {
    //   if (user.createdBy !== user.id || user.owner !== user.id) {
    //     user.createdBy = user.id
    //     user.owner = user.id
    //     this.sails.log.debug('sails-permissions: updating admin user:', user)
    //     return user.save()
    //   }
    //   return user
    // })
    .then(admin => {
      return require(path.resolve(__dirname, 'fixtures', 'permission'))
      .create(this.roles, this.controllers, admin, this.sails.config.auth)
    })
  }
}

module.exports = HookBuilder.exportHook(TotalAuth)
