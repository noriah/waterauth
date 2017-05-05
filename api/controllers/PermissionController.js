'use strict'
/**
 * PermissionController
 *
 * @description :: Server-side logic for managing permissions
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

// const R = require('ramda')

let PermissionService = sails.services.permissionservice

module.exports = {
  _config: { actions: false, shortcuts: false, rest: false },

  createPermission: sails.utils.wrapCtrlReturn(function createPermission (req, res) {
    return PermissionService.createPermission(req.body)
  }),

  getUsersWithPermission: sails.utils.wrapCtrlReturn((req, res) => {
    let permissionId = req.param('permissionId')
    return PermissionService.findUsersWithPermission(permissionId)
    // .then(users => {
    //   if (sails.utils.isProduction()) {
    //     return {users: R.pluck('name', users)}
    //   }
    //   return {users}
    // })
  }),

  getRolesWithPermission: sails.utils.wrapCtrlReturn((req, res) => {
    let permissionId = req.param('permissionId')
    return PermissionService.findRolesWithPermission(permissionId)
    // .then(roles => {
    //   if (sails.utils.isProduction()) {
    //     return {roles: R.pluck('name', roles)}
    //   }
    //   return {roles}
    // })
  })
}
