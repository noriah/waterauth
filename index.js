var R = require('ramda')
const lib = require('./lib')

var defFunctions = [
  'find',
  'findOne',
  'create',
  'update',
  'destroy'
]

function pathBase (path) {
  if (!R.is(Array, path)) {
    if (!R.is(String, path)) {
      return null
    }
    path = R.split('.', path)
  }
  return path
}

R.pathGet = function pathGet (path, obj) {
  return R.path(pathBase(path), obj)
}

R.pathHas = function pathHas (path, obj) {
  return R.pathSatisfies(x => !R.isNil(x), pathBase(path), obj)
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

class Waterauth extends lib.HookBuilder {

  constructor (sails) {
    super(sails, module)
    sails.utils = lib.utils
  }

  configure () {
    lib.passport.loadStrategies()

    if (!R.is(Object, this.sails.config.waterauth)) {
      this.sails.config.waterauth = {}
    }

    /**
     * Local cache of Model name -> id mappings to avoid excessive database lookups.
     */
    this.sails.config.blueprints.populate = false
  }

  initialize (next) {
    // let config = this.sails.config.waterauth

    // this.installModelOwnership()

    if (!this.validatePolicyConfig()) {
      this.sails.log.warn('One or more required policies are missing.')
      console.log(R.difference(permissionPolicies, this.sails.config.policies['*']))
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
    let policies = this.sails.config.policies
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
    sails.log.verbose('waterauth is syncing waterline models..')

    let models = R.noFalsy(R.map(model => {
      return model && model.globalId && model.identity && {
        name: model.globalId,
        identity: model.identity,
        attributes: R.omit(model.attributes, R.functions(model.attributes))
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
    sails.log.verbose('waterauth is now syncing waterline controllers...')

    let controllers = R.noFalsy(R.map(controller => {
      let funcs = R.functions(controller)

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
    sails.log.verbose('waterauth is updating the admin user')

    let userModel = R.find(R.propEq('name', 'User'), this.models)
    let keys = ['adminUsername', 'adminPassword', 'adminEmail']
    let hasKeys = R.all(R.identity, R.map(key => !R.isNil(sails.config.waterauth[key]), keys))
    if (!hasKeys) {
      throw new Error('Missing auth config requirement')
    }

    return sails.models.user.findOne({ username: sails.config.waterauth.adminUsername })
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
        roles: [ R.find(R.propEq('name', 'root'), this.roles).id ],
        // createdBy: 1,
        // owner: 1,
        model: userModel.id
      })
    })
  }

  initializePermissions () {
    sails.log.verbose('waterauth is finally setting up permissions...')

    return this.sails.models.user.findOne({
      username: this.sails.config.waterauth.adminUsername
    })
    // .then(user => {
    //   if (user.createdBy !== user.id || user.owner !== user.id) {
    //     user.createdBy = user.id
    //     user.owner = user.id
    //     this.sails.log.debug('waterauth: updating admin user:', user)
    //     return user.save()
    //   }
    //   return user
    // })
    .then(admin => {
      lib.permission.create(this.roles, this.controllers, admin, this.sails.config.waterauth)
    })
  }
}

module.exports = lib.HookBuilder.exportHook(Waterauth)
