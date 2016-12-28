'use strict'
/**
 * RoleController
 *
 * @description :: Server-side logic for managing roles
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const R = require('ramda')

let PermissionService = sails.services.permissionservice
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
  _config: { actions: true, shortcuts: false, rest: false },

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

  createRole: function createRole (req, res, next) {
    next()
  },

  destroyRole: function destroyRole (req, res, next) {
    next()
  },

  findOne: sails.utils.wrapCtrlReturn(function getRole (req, res) {
    let rolename = req.param('rolename')
    return RoleService.findRole(rolename)
  }),

  // get /role/:rolename/users
  getRoleUsers: sails.utils.wrapCtrlReturn(function getRoleUsers (req, res) {
    let rolename = req.param('rolename')
    return RoleService.findRoleUsers(rolename)
    .then(role => {
      let users = role.users
      if (sails.utils.isProduction()) {
        return {users: R.pluck('name', users)}
      }
      return {users}
    })
  }),

  addUsersToRole: sails.utils.wrapCtrlReturn(function addUsersToRole (req, res) {
    let rolename = req.param('rolename')
    let usernames = req.param('usernames').split(',')
    return PermissionService.addUsersToRole(usernames, rolename)
  }),

  removeUsersFromRole: sails.utils.wrapCtrlReturn(function removeUserFromRole (req, res) {
    let rolename = req.param('rolename')
    let usernames = req.param('usernames').split(',')
    return PermissionService.removeUsersFromRole(usernames, rolename)
  }),

  // /role/:rolename/permissions
  getRolePermissions: sails.utils.wrapCtrlReturn(function getRolePermissions (req, res) {
    let rolename = req.param('rolename')
    return RoleService.findRolePermissions(rolename)
    .then(role => {
      let permissions = role.permissions
      if (sails.utils.isProduction()) {
        return {permissions: R.pluck('name', permissions)}
      }
      return {permissions}
    })
  }),

  // put /role/:rolename/permissions/:permissioname
  addPermissionsToRole: sails.utils.wrapCtrlReturn(function addPermissionsToRole (req, res) {
    let rolename = req.param('rolename')
    let permissionNames = req.param('permissionnames').split(',')
    return RoleService.addPermissionToRole(rolename, permissionNames)
  }),

  // delete /role/:rolename/permissions/:permissioname
  removePermissionsFromRole: sails.utils.wrapCtrlReturn(function removePermissionsFromRole (req, res) {
    let rolename = req.param('rolename')
    let permissionNames = req.param('permissionnames').split(',')
    return RoleService.removePermissionsFromRole(rolename, permissionNames)
  })
}
