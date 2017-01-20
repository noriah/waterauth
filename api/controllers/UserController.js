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
let VerificationService = sails.services.verificationservice

// let User

// sails.after('hook:orm:loaded', () => {
//   ({
//     user: User
//   } = sails.models)
// })

module.exports = {
  _config: { actions: true, shortcuts: false, rest: false },

  findOne: sails.utils.wrapCtrlReturn(function getUser (req, res) {
    return UserService.findUser(req.param('username'))
  }),

  getUserRoles: sails.utils.wrapCtrlReturn(function getUserRoles (req, res) {
    return UserService.findUserRoles(req.param('username'))
    .then(roles => {
      if (sails.utils.isProduction()) {
        return {roles: R.pluck('name', roles)}
      }
      return {roles}
    })
  }),

  getUserPermissions: sails.utils.wrapCtrlReturn(function getUserPermissions (req, res) {
    return UserService.findUserPermissions(req.param('username'))
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
  },

  sendVerificationEmail: function sendVerificationEmail (req, res) {
    VerificationService.sendVerificationEmail(req.body, (err, status) => {
      if (err) {
        if (err.status) {
          return res.json(err.status, err)
        }
        return res.negotiate(err)
      }
      res.json(200, {status: true})
    })
  },

  verifyEmail: function verifyEmail (req, res) {
    let token = req.param('token')
    VerificationService.verify(token, (err, status) => {
      if (err) {
        if (err.status) {
          return res.json(err.status, err)
        }
        return res.negotiate(err)
      }
      res.json(200, {status: true})
    })
  }
}
