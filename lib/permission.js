'use strict'

const R = require('ramda')
const Promise = require('bluebird')

var httpMethods = [
  'get',
  'post',
  'put',
  'delete'
]

/**
 * Create default Role permissions
 */
module.exports.create = function create (roles, models, admin, config) {
  // return Promise.all([
  return grantRootPermissions(roles, models, admin, config)
    // grantRegisteredPermissions(roles, models, admin, config)
  // ])
  .then(permissions => {
    sails.log.verbose(permissions.length + ' possible permissions')
    return permissions
  })
}

function grantRootPermissions (roles, controllers, admin, config) {
  let cEntity = R.map(controllerEntity => {
    let rootRole = R.find(R.propEq('name', 'root'), roles)
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
    }, controllerEntity.functions)
  }, controllers)

  let permissions = R.flatten(cEntity)
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

        console.log(permission)

        return sails.models.permission.findOrCreate(newPermission, newPermission)
      }, roleConfig[key])
    })
    .then(newPermissions => {
      return Promise.all(newPermissions)
    })
  }, cRoles)

  return Promise.all(rolePromises)
}

// var modelRestrictions = {
//   registered: [
//     'Role',
//     'Permission',
//     'User',
//     'Passport'
//   ],
//   public: [
//     'Role',
//     'Permission',
//     'User',
//     'Model',
//     'Passport'
//   ]
// }

// TODO let users override this in the actual model definition

// function grantAdminPermissions (roles, models, admin, config) {
//   var adminRole = R.find(R.propEq('name', 'admin'), roles)
//   var permissions = R.flatten(R.map(modelEntity => {
//     // var model = sails.models[modelEntity.identity]
//     // grants.admin = R.pathGet('grants.admin', config) || grants.admin

//     return R.map(permission => {
//       console.log(`${modelEntity.identity}.${permission.action}`)
//       var newPermission = {
//         name: modelEntity.identity + '.' + permission.action,
//         model: modelEntity.id,
//         action: permission.action
//       }
//       return sails.models.permission.findOrCreate(newPermission, newPermission)
//     }, grants.root)
//   }, models))
//   return Promise.all(permissions)
// }

// function grantRegisteredPermissions (roles, models, admin, config) {
//   var registeredRole = R.find(R.propEq('name', 'registered'), roles)
//   var basePermissions = [
//     {
//       model: R.find(R.propEq('name', 'Permission'), models).id,
//       action: 'read',
//       role: registeredRole.id
//     },
//     {
//       model: R.find(R.propEq('name', 'Model'), models).id,
//       action: 'read',
//       role: registeredRole.id
//     }
//   ]

//   // XXX copy/paste from above. terrible. improve.
//   var permittedModels = R.filter(model => {
//     return !R.contains(model.name, modelRestrictions.registered)
//   }, models)

//   var grantPermissions = R.flatten(R.map(modelEntity => {
//     grants.registered = R.pathGet('grants.registered', config) || grants.registered

//     return R.map(permission => {
//       return {
//         name: modelEntity.name + '.' + permission.action,
//         model: modelEntity.id,
//         action: permission.action,
//         role: registeredRole.id
//       }
//     }, grants.registered)
//   }, permittedModels))

//   return Promise.all(
//     [ ...basePermissions, ...grantPermissions ].map(permission => {
//       return sails.models.permission.findOrCreate(permission, permission)
//     })
//   )
// }
