'use strict'

/**
 * Token.js
 *
 * JWT token service which handles issuing and verifying tokens.
 */
const jwt = require('jwt-simple')
const moment = require('moment')
const uuid = require('node-uuid')
const R = require('ramda')
const ServiceError = require('../../lib/error/ServiceError')

let Jwt
let JwtUse

sails.after('hook:orm:loaded', () => {
  ({
    jwt: Jwt,
    jwtuse: JwtUse
  } = sails.models)
})

let TokenService = {}

// https://github.com/waterlock/waterlock/blob/master/lib/utils.js#L97
/**
 * Return access token from request
 *
 * @param  {Object} req the express request object
 * @return {String} token
 * @api public
 */
TokenService.getTokenFromRequest = function getTokenFromRequest (req) {
  return new Promise((resolve, reject) => {
    if (req.headers && req.headers.authorization) {
      let parts = req.headers.authorization.split(' ')
      if (parts.length === 2) {
        let scheme = parts[0]
        let credentials = parts[1]

        if (/^Bearer$/i.test(scheme)) {
          return resolve(credentials)
        }
      } else {
        return reject(new ServiceError(400, 'Bad authorization header format', 'E_TOKEN_BAD_FORMAT'))
      }
    } else {
      let token = sails.utils.allParams(req).token
      if (!R.isNil(token)) {
        return resolve(token)
      } else {
        return reject(new ServiceError(401, 'No token found', 'E_TOKEN_MISSING'))
        // return reject(null)
      }
    }
  })
}

// https://github.com/waterlock/waterlock/blob/master/lib/utils.js#L64
/**
 * Creates a new JWT token
 *
 * @param  {Integer} req
 * @param  {Object} res
 * @param  {Object} user   the user model
 * @return {Object}       the created jwt token.
 * @api public
 */
TokenService.createToken = function createToken (req, user) {
  let jwtConf = sails.config.jwt || {}
  let expiryUnit = (jwtConf.expiry && jwtConf.expiry.unit) || 'days'
  let expiryLength = (jwtConf.expiry && jwtConf.expiry.length) || 7
  let expires = moment().add(expiryLength, expiryUnit).valueOf()
  let issued = Date.now()
  user = user || req.user

  let {ip: addr} = sails.utils.addressFromRequest(req)

  return new Promise((resolve, reject) => {
    let token = jwt.encode({
      iss: user.id + '|' + addr,
      sub: jwtConf.subject,
      aud: jwtConf.audience,
      exp: expires,
      nbf: issued,
      iat: issued,
      jti: uuid.v1()
    }, jwtConf.secret, jwtConf.algorithm)

    return resolve({
      uid: user.id,
      token: token,
      expires: expires
    })
  })
}

/**
 * Save the token
 * Usually used after creation of a token
 * @param  {Object} tokenObj The object version of a token must contain user
 *                           id (uid) and jwt token (token)
 * @return {Promise}          A promise representing the result
 */
TokenService.saveToken = function saveToken (tokenObj) {
  if (!(R.has('uid', tokenObj) && R.has('token', tokenObj))) {
    return Promise.reject(new Error(`${tokenObj} is not a valid token object`))
  }

  return Jwt.create({
    token: tokenObj.token,
    owner: tokenObj.uid
  })
}

/**
 * Save a use for the given token into the database
 * @param  {Object} req   Request object
 * @param  {Object} res   Response object
 * @param  {Object} tokenObj Waterline Token ORM object
 * @return {Promise}       A promise to be fulfilled
 */
TokenService.useToken = function useToken (tokenObj, address) {
  let use = {
    jsonWebToken: tokenObj.id,
    remoteAddress: address
  }

  return JwtUse.create(use)
  .then(() => tokenObj)
}

// TokenService.findAndUseToken = function findAndUseToken (req, res, token) {
//   if (R.is(Object, token)) {
//     token = token.token
//   }

//     var {ip: addr} = sails.utils.addressFromRequest(req)

//     var use = {
//       jsonWebToken: jwtObj.id,
//       remoteAddress: addr
//     })

//   })
// }

// TokenService.getLeastUsedToken = function getLeastUsedToken (req, res, user) {
//   user = user || req.user
//   return Jwt.find({owner: user.id})
//   .populate('uses')
//   .then(R.sortBy(x => R.length(R.prop('uses', x))))
//   .then(R.prop(0))
//   .then(token => {
//     if (!R.isNil(token)) {
//       return token
//     } else {
//       return null
//     }
//   })
// }

/**
 * Validates a token
 *
 * @param  {String}   token the token to be validated
 */
TokenService.validateToken = function validateToken (token) {
  let jwtConf = sails.config.jwt

  let clockTolerance = (jwtConf.clockTolerance || 0) * 1000

  return new Promise((resolve, reject) => {
    let _token
    try {
      // decode the token
      _token = jwt.decode(token, jwtConf.secret, jwtConf.algorithm)
    } catch (err) {
      err.tokenError = true
      err.code = 'E_BAD_TOKEN'
      return reject(err)
    }

    // set the time of the request
    let _reqTime = Date.now()

    // If token is expired
    if (_token.exp <= _reqTime) {
      // sails.log.debug('access token rejected, reason: EXPIRED')
      // return reject(new Error())
      return reject(new ServiceError(401, 'Your token is expired.', 'E_TOKEN_EXPIRED'))
    }

    // If token is early
    if ((_reqTime + clockTolerance) <= _token.nbf) {
      // sails.log.debug('access token rejected, reason: TOKEN EARLY')
      // return reject(new Error('This token is early.'))
      return reject(new ServiceError(401, 'This token is early.', 'E_TOKEN_EARLY'))
    }

    // If audience doesn't match
    if (sails.config.jwt.audience !== _token.aud) {
      // sails.log.debug('access token rejected, reason: AUDIENCE')
      // return reject(new Error('This token cannot be accepted for this domain.'))
      return reject(new ServiceError(401, 'This token cannot be accepted for this domain.', 'E_TOKEN_DOMAIN'))
    }

    let _iss = _token.iss.split('|')

    return resolve({
      uid: _iss[0],
      token: token
    })
  })
  .then(() => {
    return Jwt.findOne({token})
    .then(jwtObj => {
      if (R.isNil(jwtObj)) {
        // res.json(401, {error: 'E_TOKEN_NOT_FOUND'})
        // return Promise.reject(new Error('Token not found'))
        return Promise.reject(new ServiceError(401, 'Token not found', 'E_TOKEN_INVALID'))
      }

      if (jwtObj.revoked) {
        // res.json(401, {error: 'E_TOKEN_REVOKED'})
        return Promise.reject(new ServiceError(401, 'Token as been revoked', 'E_TOKEN_REVOKED'))
      }

      return jwtObj
    })
  })
}
/**
 * Service method to verify that the token we received on a request hasn't be tampered with.
 *
 * @param   {String}    token   Token to validate
 * @param   {Function}  next    Callback function
 *
 * @returns {*}
 */

/**
 * [getUserFromToken description]
 * @param  {String|Object} token Token to use for user lookup
 * @return {[type]}       [description]
 */
TokenService.getUserFromToken = function getUserFromToken (token) {
  // return sails.models.
}

module.exports = TokenService
