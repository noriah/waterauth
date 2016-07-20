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
  return grantRootPermissions(roles, models, config)
    // grantRegisteredPermissions(roles, models, admin, config)
  // ])
  .then(permissions => {
    sails.log.verbose(permissions.length + ' possible permissions')
    return permissions
  })
}

function grantRootPermissions (roles, controllers, config) {
  let ctrls = R.filter(ctrl => !R.contains(ctrl.identity, hookControllers), controllers)
  let rootRole = R.find(R.propEq('identity', 'root'), roles)
  let cEntity = R.map(controllerEntity => {
    // var model = sails.models[controllerEntity.identity]
    // grants.admin = R.pathGet('grants.admin', config) || grants.admin

    return R.map(ctrlProperty => {
      return R.map(httpMethod => {
        let newPermission = {
          name: R.join('.', [controllerEntity.identity, ctrlProperty, httpMethod]),
          controller: controllerEntity.id,
          ctrlProperty: ctrlProperty,
          httpMethod: httpMethod,
          role: rootRole.id
        }

        return sails.models.permission.findOrCreate(newPermission, newPermission)
      }, httpMethods)
      // }, pRoutes[controllerEntity.identity][ctrlProperty])
    }, controllerEntity.functions)
    // }, R.keys(pRoutes[controllerEntity.identity]))
  }, ctrls)

  let hookParts = R.map(perm => {
    let parts = R.split('.', perm)
    let ctrl = R.find(R.propEq('identity', parts[0]), controllers)
    let newPermission = {
      name: perm,
      controller: ctrl.id,
      ctrlProperty: parts[1],
      httpMethod: parts[2],
      role: rootRole.id
    }

    return sails.models.permission.findOrCreate(newPermission, newPermission)
  }, hookPerms)

  let permissions = R.flatten(R.concat(cEntity, hookParts))
  // console.log(permissions)

  return Promise.all(permissions)
}

module.exports.createDefaultRoles = function createDefaultRoles (roleConfig, controllers) {
  let cRoles = R.keys(roleConfig)

  let rolePromises = R.map(key => {
    let newRole = {name: key}

    return sails.models.role.findOrCreate(newRole, newRole)
    .then(role => {
      return R.map(permission => {
        let splitPerm = R.split('.', permission)
        let controller = R.find(R.propEq('identity', splitPerm[0]), controllers)
        let newPermission = {
          name: permission,
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
