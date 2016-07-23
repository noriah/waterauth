'use strict'
/**
 * RoleController
 *
 * @description :: Server-side logic for managing roles
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

// const R = require('ramda')

let PermissionService = sails.services.permissionservice
let RoleService = sails.services.roleservice

let Permission
let Role
let User

sails.after('hook:orm:loaded', () => {
  ({
    models: {
      permission: Permission,
      role: Role,
      user: User
    }
  } = sails)
})

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

  // findOne: function getRole (req, res, next) {
  //   let roleName = req.param('rolename')
  //   if (R.isNil(roleName) || R.isEmpty(roleName)) {
  //     return res.json(404, {error: 'E_ROLE_NOT_FOUND'})
  //   }
  //   return findActiveRole(roleName)
  //   .then(role => {
  //     if (R.isNil(role)) {
  //       return res.json(404, {error: 'E_ROLE_NOT_FOUND'})
  //     }
  //     return res.json(200, {role})
  //   })
  //   .catch(next)
  // },

  createRole: function createRole (req, res, next) {
    next()
  },

  destroyRole: function destroyRole (req, res, next) {
    next()
  },

  // get /role/:rolename/users
  getRoleUsers: sails.utils.wrapCtrlRetrun(RoleService.getRoleUsers),

  addUsersToRole: sails.utils.wrapCtrlRetrun(function addUsersToRole (req, res) {
    let rolename = req.param('rolename')
    let usernames = req.param('usernames').split(',')
    return PermissionService.addUsersToRole(usernames, rolename)
  }),

  removeUserFromRole: sails.utils.wrapCtrlRetrun(function removeUserFromRole (req, res) {
    let rolename = req.param('rolename')
    let usernames = req.param('usernames').split(',')
    return PermissionService.removeUserFromRole(usernames, rolename)
  }),

  // /role/:rolename/permissions
  getRolePermissions: sails.utils.wrapCtrlRetrun(RoleService.getRolePermissions),

  // put /role/:rolename/permissions/:permissioname
  addPermissionToRole: sails.utils.wrapCtrlRetrun(RoleService.addPermissionToRole),

  // delete /role/:rolename/permissions/:permissioname
  removePermissionFromRole: sails.utils.wrapCtrlRetrun(RoleService.removePermissionFromRole)

}
