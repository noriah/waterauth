'use strict'

const R = require('ramda')
const ServiceError = require('../../lib/error/ServiceError')

let TokenService = sails.services.tokenservice

let User

sails.after('hook:orm:loaded', () => {
  ({
    user: User
  } = sails.models)
})

/**
 * Policy to check that request is done via authenticated user. This policy uses existing
 * JWT tokens to validate that user is authenticated. If use is not authenticate policy
 * sends 401 res back to client.
 *
 * @param   {Request}   req         Request object
 * @param   {Response}  res         Response object
 * @param   {Function}  next        Callback function
 *
 * @returns {*}
 */
module.exports = function TokenAuthPolicy (req, res, next) {
  return TokenService.getTokenFromRequest(req)
  .then(token => TokenService.validateToken(token))
  .then(tObj => {
    if (sails.config.jwt.trackTokens) {
      var {ip: addr} = sails.utils.addressFromRequest(req)
      return TokenService.useToken(tObj, addr)
    } else {
      return tObj
    }
  })
  .then(tObj => {
    req.token = req.token || {}
    req.token.id = tObj.id
    req.token.owner = tObj.owner
    return User.findOne(tObj.owner)
    .populate('roles')
  })
  .then(user => {
    if (!user) {
      return res.json(401, {error: 'E_TOKEN_INVALID'})
    }

    req.user = user
    req.session.authenticated = true

    sails.log.info('Token Validated for', req.user.username)

    req.query && delete req.query.token
    req.body && delete req.body.token

    return next()
  })
  .catch(err => {
    if (err instanceof ServiceError || !R.isNil(err.serviceError)) {
      return res.json(err.errNum, {error: err.code})
    }
    // } else if (!R.isNil(err)) {
      // res.json(500, {stack: err.stack})
    return next(err)
    // }
    // next()
  })
}
