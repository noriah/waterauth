'use strict'
/**
 * PermissionController
 *
 * @description :: Server-side logic for managing permissions
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

module.exports = {
  _config: { actions: false, shortcuts: false, rest: false },

  getObjectsWithPermission: function getObjectsWithPermission (req, res, next) {
    next()
  },

  getUsersWithPermission: function getUsersWithPermission (req, res, next) {
    next()
  },

  getRolesWithPermission: function getRolesWithPermission (req, res, next) {
    next()
  }
}
