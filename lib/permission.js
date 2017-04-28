'use strict'

const R = require('ramda')
const Promise = require('bluebird')

const routeCfg = require('../config/routes.js')

const splitSpace = R.split(' ')
const getRouteAction = R.compose(R.toLower, R.replace(/(?!^)Controller/, ''))

const hookControllers = [
  'auth',
  'model',
  'permission',
  'role',
  'token',
  'user'
]

var hookPerms = []
// let pushHookPerms = hookPerms.push
R.forEach(key => {
  let routeAction = getRouteAction(routeCfg.routes[key])
  let httpMethod = splitSpace(R.toLower(key))[0]
  let perm = `${routeAction}.${httpMethod}`
  hookPerms.push(perm)
}, R.keys(routeCfg.routes))

hookPerms = R.uniq(hookPerms)

var httpMethods = [
  'get',
  'post',
  'put',
  'delete'
]

/**
 * Create default Role permissions
 */
module.exports.create = function create (roles, models, config) {
  // return Promise.all([
  return createDefaultPermissions(models)
  .then(permissions => {
    sails.log.verbose(permissions.length + ' possible permissions')
    let rootRole = R.find(R.propEq('identity', 'root'), roles)
    return grantRootAllPermissions(rootRole, permissions)
    .return(permissions)
  })
  // return grantRootPermissions(roles, models, config)
    // grantRegisteredPermissions(roles, models, admin, config)
  // ])
  // .then(permissions => {
  //   sails.log.verbose(permissions.length + ' possible permissions')
  //   return permissions
  // })
}

function createDefaultPermissions (controllers) {
  let ctrls = R.filter(ctrl => !R.contains(ctrl.identity, hookControllers), controllers)
  let cEntity = R.map(controllerEntity => {
    return R.map(ctrlProperty => {
      return R.map(httpMethod => {
        return sails.services.permissionservice.createPermission({
          controller: controllerEntity,
          ctrlProperty: ctrlProperty,
          httpMethod: httpMethod,
          editable: false,
          description: 'Built in Permission'
        })
        // let name = R.join('.', [controllerEntity.identity, ctrlProperty, httpMethod])

        // let search = {
        //   name: name,
        //   type: 'controller'
        // }

        // let query = {
        //   name: name,
        //   type: 'controller',
        //   description: 'Built in Permission',
        //   editable: false
        // }

        // let perm = {
        //   name: name,
        //   controller: controllerEntity.id,
        //   ctrlProperty: ctrlProperty,
        //   httpMethod: httpMethod,
        //   type: 'controller'
        // }

        // return sails.models.permission.findOrCreate(search, query)
      }, httpMethods)
    }, controllerEntity.functions)
  }, ctrls)

  let hookParts = R.map(perm => {
    let parts = R.split('.', perm)
    return sails.services.permissionservice.createPermission({
      controller: parts[0],
      ctrlProperty: parts[1],
      httpMethod: parts[2],
      editable: false,
      description: 'Built in Permission'
    })
    // let ctrl = R.find(R.propEq('identity', parts[0]), controllers)

    // let search = {
    //   name: perm,
    //   type: 'controller'
    // }

    // let query = {
    //   name: perm,
    //   type: 'controller',
    //   description: 'Built in Permission',
    //   editable: false
    // }

    // let newPerm = {
    //   name: perm,
    //   // controller: ctrl.id,
    //   // ctrlProperty: parts[1],
    //   // httpMethod: parts[2],
    //   type: 'controller'
    // }

    // return sails.models.permission.findOrCreate(query, query)
  }, hookPerms)

  let permissions = R.flatten(R.concat(cEntity, hookParts))
  return Promise.all(permissions)
}

function grantRootAllPermissions (rootRole, permissions) {
  let promises = R.map(permission => {
    let query = {
      permission: permission.id,
      role: rootRole.id,
      relation: 'role'
    }

    return sails.models.grantmap.findOrCreate(query, query)
  }, permissions)

  return Promise.all(promises)
}

module.exports.createDefaultRoles = function createDefaultRoles (roleConfig, controllers) {
  let cRoles = R.keys(roleConfig)

  let rolePromises = R.map(key => {
    let newRole = {name: key}

    return sails.models.role.findOrCreate(newRole, newRole)
    .then(role => {
      return R.map(permission => {
        if (R.is(String, permission)) {
          permission = {
            name: permission,
            description: 'Built in Permission'
          }
        }
        let splitPerm = R.split('.', permission.name)
        let controller = R.find(R.propEq('identity', splitPerm[0]), controllers)
        let newPermission = {
          role: role.id,
          controller: controller.id,
          ctrlProperty: splitPerm[1],
          httpMethod: splitPerm[2]
        }

        return sails.models.permission.findOrCreate(newPermission, newPermission)
      }, roleConfig[key])
    })
    .then(newPermissions => {
      return Promise.all(newPermissions)
    })
  }, cRoles)

  return Promise.all(rolePromises)
}
