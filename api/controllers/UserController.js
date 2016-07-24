'use strict'
/**
 * UserController
 *
 * @description :: Server-side logic for managing Users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

const R = require('ramda')

let PassportService = sails.services.passportservice
let UserService = sails.services.userservice

let User

sails.after('hook:orm:loaded', () => {
  ({
    user: User
  } = sails.models)
})

module.exports = {
  _config: { actions: true, shortcuts: false, rest: false },

  findOne: sails.utils.wrapCtrlReturn(function getUser (req, res) {
    let username = req.param('username')
    return UserService.findUser(username)
  }),

  getUserRoles: sails.utils.wrapCtrlReturn(function getUserRoles (req, res) {
    let username = req.param('username')
    return UserService.findUserRoles(username)
    .then(roles => {
      if (sails.utils.isProduction()) {
        return {roles: R.pluck('name', roles)}
      }
      return {roles}
    })
  }),

  getUserPermissions: sails.utils.wrapCtrlReturn(function getUserPermissions (req, res) {
    let username = req.param('username')
    return UserService.findUserPermissions(username)
    .then(permissions => {
      if (sails.utils.isProduction()) {
        return {permissions: R.pluck('name', permissions)}
      }
      return {permissions}
    })
  }),

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
