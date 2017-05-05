'use strict'
/**
 * RoleController
 *
 * @description :: Server-side logic for managing roles
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const R = require('ramda')

// let PermissionService = sails.services.permissionservice
let RoleService = sails.services.roleservice

// let Permission
// let Role
// let User

// sails.after('hook:orm:loaded', () => {
//   ({
//     permission: Permission,
//     role: Role,
//     user: User
//   } = sails.models)
// })

module.exports = {
  _config: { actions: false, shortcuts: false, rest: false },

  // find: function getAllRoles (req, res, next) {
  //   Role.find({active: true})
  //   .then(roles => {
  //     if (sails.config.environment === 'production') {
  //       return res.json(200, {roles: R.pluck('name', roles)})
  //     }
  //     return res.json(200, {roles})
  //   })
  //   .catch(next)
  // },

  createRole: sails.utils.wrapCtrlReturn(function createRole (req, res) {
    return RoleService.createRole(req.body)
    .then(role => {
      return res.created(role)
    })
  }),

  destroyRole: sails.utils.wrapCtrlReturn(function destroyRole (req, res) {
    return RoleService.destroyRole(req.param('roleId'))
  }),

  // findOne: sails.utils.wrapCtrlReturn(function getRole (req, res) {
  //   return RoleService.findRole(req.param('rolename'))
  // }),

  // get /role/:rolename/users
  getRoleUsers: sails.utils.wrapCtrlReturn(function getRoleUsers (req, res) {
    return RoleService.findRoleUsers(req.param('roleId'))
    .then(role => {
      let users = role.users
      // if (sails.utils.isProduction()) {
      //   return {users: R.pluck('name', users)}
      // }
      return {users}
    })
  }),

  addUsersToRole: sails.utils.wrapCtrlReturn(function addUsersToRole (req, res) {
    let roleId = req.param('roleId')
    let userIds = req.param('userIds').split(',')
    return RoleService.addUsersToRole(roleId, userIds)
  }),

  removeUsersFromRole: sails.utils.wrapCtrlReturn(function removeUserFromRole (req, res) {
    let roleId = req.param('roleId')
    let userIds = req.param('userIds').split(',')
    return RoleService.removeUsersFromRole(roleId, userIds)
  }),

  // /role/:rolename/permissions
  getRolePermissions: sails.utils.wrapCtrlReturn(function getRolePermissions (req, res) {
    return RoleService.findRolePermissions(req.param('roleId'))
    // .then(permissions => {
    //   // let permissions = role.permissions
    //   // if (sails.utils.isProduction()) {
    //   //   return {permissions: R.pluck('name', permissions)}
    //   // }
    //   return {permissions}
    // })
  }),

  // put /role/:rolename/permissions/:permissioname
  addPermissionsToRole: sails.utils.wrapCtrlReturn(function addPermissionsToRole (req, res) {
    let roleId = req.param('roleId')
    let permissionNames = req.param('permissionIds').split(',')
    return RoleService.addPermissionToRole(roleId, permissionNames)
  }),

  // delete /role/:rolename/permissions/:permissioname
  removePermissionsFromRole: sails.utils.wrapCtrlReturn(function removePermissionsFromRole (req, res) {
    let roleId = req.param('roleId')
    let permissionNames = req.param('permissionIds').split(',')
    return RoleService.removePermissionsFromRole(roleId, permissionNames)
  })
}
