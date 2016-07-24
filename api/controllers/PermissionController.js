'use strict'
/**
 * PermissionController
 *
 * @description :: Server-side logic for managing permissions
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const R = require('ramda')

let PermissionService = sails.services.permissionservice

module.exports = {
  _config: { actions: false, shortcuts: false, rest: false },

  getUsersWithPermission: sails.utils.wrapCtrlReturn((req, res) => {
    let permissionName = req.param('permissionname')
    return PermissionService.findUsersWithPermission(permissionName)
    .then(users => {
      if (sails.utils.isProduction()) {
        return {users: R.pluck('name', users)}
      }
      return {users}
    })
  }),

  getRolesWithPermission: sails.utils.wrapCtrlReturn((req, res) => {
    let permissionName = req.param('permissionname')
    return PermissionService.findRolesWithPermission(permissionName)
    .then(roles => {
      if (sails.utils.isProduction()) {
        return {roles: R.pluck('name', roles)}
      }
      return {roles}
    })
  })
}
