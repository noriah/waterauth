'use strict'
var R = require('ramda')

var User
var TokenService

sails.after('hook:orm:loaded', () => {
  ({
    models: {
      user: User
    },
    services: {
      tokenservice: TokenService
    }
  } = sails)
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
    if (err instanceof TokenService.TokenError || !R.isNil(err.tokenError)) {
      return res.json(err.eCode, {error: err.code})
    }
    // } else if (!R.isNil(err)) {
      // res.json(500, {stack: err.stack})
    return next(err)
    // }
    // next()
  })
}
