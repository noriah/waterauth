'use strict'
/**
 * UserController
 *
 * @description :: Server-side logic for managing Users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const R = require('ramda')

var Permission
var User
var PassportService

sails.after('hook:orm:loaded', () => {
  ({
    models: {
      permission: Permission,
      user: User
    },
    services: {
      passportservice: PassportService
    }
  } = sails)
})

module.exports = {
  _config: { actions: false, shortcuts: false, rest: false },

  getUser: function getUser (req, res, next) {
    let username = req.params('username')
    return User.findOne({username})
    .then(user => {
      if (R.isNil(user)) {
        return res.json(404, {error: 'E_USER_NOT_FOUND'})
      }
      return res.json(200, {user})
    })
    .catch(next)
  },

  getUserRoles: function getUserRoles (req, res, next) {
    let username = req.params('username')
    return User.findOne({username})
    .populate('roles', {active: true})
    .then(user => {
      if (R.isNil(user)) {
        return res.json(404, {error: 'E_USER_NOT_FOUND'})
      }
      if (sails.config.environment === 'production') {
        return res.json(200, {roles: R.pluck('name', user.roles)})
      }
      return res.json(200, {roles: user.roles})
    })
    .catch(next)
  },

  getUserPermissions: function getUserPermissions (req, res, next) {
    let username = req.params('username')
    return User.findOne({username})
    .populate('roles', {active: true})
    .then(user => {
      if (R.isNil(user)) {
        return res.json(404, {error: 'E_USER_NOT_FOUND'})
      }

      return Permission.find({
        or: [
          { role: R.pluck('id', user.roles) },
          { user: user.id }
        ]
      })
      .then(permissions => {
        if (sails.config.environment === 'production') {
          return res.json(200, {permissions: R.pluck('name', permissions)})
        }
        return res.json(200, {permissions})
      })
    })
    .catch(next)
  },

  /**
   * @override
   */
  create: function (req, res, next) {
    PassportService.protocols.local.register(req.body, (err, user) => {
      if (err) {
        return res.negotiate(err)
      }
      res.json(200, {user})
    })
  },

  update: function (req, res, next) {
    PassportService.protocols.local.update(req.body, (err, user) => {
      if (err) {
        return res.negotiate(err)
      }
      res.json(200, {user})
    })
  },

  me: function (req, res) {
    res.json(200, {user: req.user})
  }
}
