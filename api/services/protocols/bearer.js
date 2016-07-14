'use strict'
/*
 * Bearer Authentication Protocol
 *
 * Bearer Authentication is for authorizing API requests. Once
 * a user is created, a token is also generated for that user
 * in its passport. This token can be used to authenticate
 * API requests.
 *
 */

module.exports = function bearerProtocol (req, token, done) {
  sails.models.passport.findOne({ accessToken: token })
  .then(pp => {
    if (!pp) {
      return done(null, false)
    }

    return sails.models.user.findOne({id: pp.user})
    .then(user => {
      if (!user) {
        return done(null, false)
      }

      // delete access_token from params
      // to avoid conflicts with blueprints query builder
      delete req.query.access_token
      return done(null, user, { scope: 'all' })
    })
  })
  .catch(err => {
    return done(err)
  })
}
