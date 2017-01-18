'use strict'
/*
 * bearerAuth Policy
 *
 * Policy for authorizing API requests. The request is authenticated if the
 * it contains the accessToken in header, body or as a query param.
 * Unlike other strategies bearer doesn't require a session.
 * Add this policy (in config/policies.js) to controller actions which are not
 * accessed through a session. For example: API request from another client
 *
 * @param {Object}   req
 * @param {Object}   res
 * @param {Function} next
 */

let PassportService = sails.services.passportservice

module.exports = function BearerAuthPolicy (req, res, next) {
  return PassportService.passportLib.authenticate('bearer', { session: false })(req, res, next)
}
