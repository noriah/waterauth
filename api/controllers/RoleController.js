'use strict'
/**
 * RoleController
 *
 * @description :: Server-side logic for managing roles
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const R = require('ramda')

let Permission
let Role
let User
let RoleService = sails.services.roleservice

sails.after('hook:orm:loaded', () => {
  ({
    models: {
      permission: Permission,
      role: Role,
      user: User
    }
  } = sails)
})

function _wrap (func) {
  return function _wrappedFunction (req, res, next) {
    func(req, res, next)
    .then(result => {
      return res.json(200, result)
    })
    .catch(err => {
      if (err instanceof RoleService.RoleError || !R.isNil(err.roleError)) {
        return res.json(err.errNum, {error: err.code})
      }

      return next(err)
    })
  }
}

module.exports = {
  _config: { actions: false, shortcuts: false, rest: false },

  find: function getAllRoles (req, res, next) {
    Role.find({active: true})
    .then(roles => {
      if (sails.config.environment === 'production') {
        return res.json(200, {roles: R.pluck('name', roles)})
      }
      return res.json(200, {roles})
    })
    .catch(next)
  },

  findOne: function getRole (req, res, next) {
    let roleName = req.param('rolename')
    if (R.isNil(roleName) || R.isEmpty(roleName)) {
      return res.json(404, {error: 'E_ROLE_NOT_FOUND'})
    }
    return findActiveRole(roleName)
    .then(role => {
      if (R.isNil(role)) {
        return res.json(404, {error: 'E_ROLE_NOT_FOUND'})
      }
      return res.json(200, {role})
    })
    .catch(next)
  },

  createRole: function createRole (req, res, next) {
    next()
  },

  destroyRole: function destroyRole (req, res, next) {
    next()
  },

  addUserToRole: _wrap(RoleService.addUserToRole),

  removeUserFromRole: _wrap(RoleService.removeUserFromRole),
  // get /role/:rolename/users
  getRoleUsers: _wrap(RoleService.getRoleUsers),

  // put /role/:rolename/permissions/:permissioname
  addPermissionToRole: function addPermissionToRole (req, res, next) {
    next()
  },

  // delete /role/:rolename/permissions/:permissioname
  removePermissionFromRole: function removePermissionFromRole (req, res, next) {
    next()
  },

  // /role/:rolename/permissions
  getRolePermissions: _wrap(RoleService.getRolePermissions)
}
