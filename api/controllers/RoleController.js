/**
 * RoleController
 *
 * @description :: Server-side logic for managing roles
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
  _config: { actions: false, shortcuts: false, rest: false },

  getAllRoles: function getAllRoles (req, res, next) {
    next()
  },

  getRole: function getRole (req, res, next) {
    next()
  },

  createRole: function createRole (req, res, next) {
    next()
  },

  destroyRole: function destroyRole (req, res, next) {
    next()
  },

  addUserToRole: function addUserToRole (req, res, next) {
    let roleName = req.param('rolename')
    let userName = req.param('username')
    next()
  },

  removeUserFromRole: function removeUserFromRole (req, res, next) {
    let roleName = req.param('rolename')
    let userName = req.param('username')
    next()
  },

  getRoleUsers: function getRoleUsers (req, res, next) {
    next()
  },

  addPermissionToRole: function addPermissionToRole (req, res, next) {
    next()
  },

  removePermissionFromRole: function removePermissionFromRole (req, res, next) {
    next()
  },

  getRolePermissions: function getRolePermissions (req, res, next) {
    next()
  }
}
