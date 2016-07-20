'use strict'
/**
 * RoleController
 *
 * @description :: Server-side logic for managing roles
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const R = require('ramda')

var Permission
var Role
var User
var PassportService

sails.after('hook:orm:loaded', () => {
  ({
    models: {
      permission: Permission,
      role: Role,
      user: User
    },
    services: {
      passportservice: PassportService
    }
  } = sails)
})

module.exports = {
  _config: { actions: false, shortcuts: false, rest: false },

  getAllRoles: function getAllRoles (req, res, next) {
    Role.find({active: true})
    .then(roles => {
      if (sails.config.environment === 'production') {
        return res.json(200, {roles: R.pluck('name', roles)})
      }
      return {roles}
    })
    .catch(next)
  },

  getRole: function getRole (req, res, next) {
    let roleName = req.param('rolename')
    if (R.isNil(roleName) || R.isEmpty(roleName)) {
      return res.json(404, {error: 'E_ROLE_NOT_FOUND'})
    }
    roleName = R.toLower(roleName)
    return Role.findOne({identity: roleName})
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

  addUserToRole: function addUserToRole (req, res, next) {
    let roleName = req.param('rolename')
    if (R.isNil(roleName) || R.isEmpty(roleName)) {
      return res.json(404, {error: 'E_ROLE_NOT_FOUND'})
    }
    roleName = R.toLower(roleName)

    let username = req.param('username')
    if (R.isNil(username) || R.isEmpty(username)) {
      return res.json(404, {error: 'E_ROLE_NOT_FOUND'})
    }
    username = R.toLower(username)

    return Promise.all([
      User.findOne({username}).populate('roles'),
      Role.findOne({identity: roleName})
    ])
    .then(([user, role]) => {
      if (R.isNil(user)) {
        return res.json(404, {error: 'E_USER_NOT_FOUND'})
      }

      if (R.isNil(role)) {
        return res.json(404, {error: 'E_USER_NOT_FOUND'})
      }

      user.roles.add(role.id)
      return user.save()
    })
    .then(user => {
      return res.json(200, {roles: user.roles})
    })
    .catch(next)
  },

  removeUserFromRole: function removeUserFromRole (req, res, next) {
    let roleName = req.param('rolename')
    if (R.isNil(roleName) || R.isEmpty(roleName)) {
      return res.json(404, {error: 'E_ROLE_NOT_FOUND'})
    }
    roleName = R.toLower(roleName)

    let username = req.param('username')
    if (R.isNil(username) || R.isEmpty(username)) {
      return res.json(404, {error: 'E_ROLE_NOT_FOUND'})
    }
    username = R.toLower(username)

    return Promise.all([
      User.findOne({username}).populate('roles'),
      Role.findOne({identity: roleName})
    ])
    .then(([user, role]) => {
      if (R.isNil(user)) {
        return res.json(404, {error: 'E_USER_NOT_FOUND'})
      }

      if (R.isNil(role)) {
        return res.json(404, {error: 'E_USER_NOT_FOUND'})
      }

      user.roles.add(role.id)
      return user.save()
    })
    .then(user => {
      return res.json(200, {roles: user.roles})
    })
    .catch(next)
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
