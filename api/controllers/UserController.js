'use strict'
/**
 * UserController
 *
 * @description :: Server-side logic for managing Users
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

var PassportService

sails.after('hook:orm:loaded', () => {
  ({
    services: {
      passportservice: PassportService
    }
  } = sails)
})

module.exports = {
  /**
   * @override
   */
  create: function (req, res, next) {
    PassportService.protocols.local.register(req.body, (err, user) => {
      if (err) {
        return res.negotiate(err)
      }
      res.json(200, user)
    })
  },

  update: function (req, res, next) {
    PassportService.protocols.local.update(req.body, (err, user) => {
      if (err) {
        return res.negotiate(err)
      }
      res.json(200, user)
    })
  },

  me: function (req, res) {
    res.json(200, req.user)
  }
}

