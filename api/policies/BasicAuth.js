'use strict'

const localProtocol = require('../services/protocols/local')

/**
 * basicAuth
 *
 * If HTTP Basic Auth credentials are present in the headers, then authenticate the
 * user for a single request.
 */
module.exports = function BasicAuthPolicy (req, res, next) {
  let auth = req.headers.authorization
  if (!auth || auth.search('Basic ') !== 0) {
    return next()
  }

  let authString = new Buffer(auth.split(' ')[1], 'base64').toString()
  let username = authString.split(':')[0]
  let password = authString.split(':')[1]

  sails.log.silly('authenticating', username, 'using basic auth:', req.url)

  localProtocol.login(req, username, password, (error, user, passport) => {
    if (error) {
      return next(error)
    }
    if (!user) {
      req.session.authenticated = false
      return res.json(403, { error: `Could not authenticate user ${username}` })
    }

    req.user = user
    req.session.authenticated = true
    req.session.passport = passport

    next()
  })
}
