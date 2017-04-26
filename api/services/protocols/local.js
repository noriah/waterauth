'use strict'
const crypto = require('crypto')
const base64URL = require('base64url')
const SAError = require('../../../lib/error/SAError.js')
const R = require('ramda')

/**
 * Local Authentication Protocol
 *
 * The most widely used way for websites to authenticate users is via a username
 * and/or email as well as a password. This module provides functions both for
 * registering entirely new users, assigning passwords to already registered
 * users and validating login requesting.
 *
 * For more information on local authentication in Passport.js, check out:
 * http://passportjs.org/guide/username-password/
 */

const EMAIL_REGEX = /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i

/**
 * Use validator module isEmail function
 *
 * @see <https://github.com/chriso/validator.js/blob/3.18.0/validator.js#L38>
 * @see <https://github.com/chriso/validator.js/blob/3.18.0/validator.js#L141-L143>
 */
function validateEmail (str) {
  return EMAIL_REGEX.test(str)
}

function generateToken () {
  return base64URL(crypto.randomBytes(48))
}

/**
 * Register a new user
 *
 * This method creates a new user from a specified email, username and password
 * and assign the newly created user a local Passport.
 *
 * @param {String}   username
 * @param {String}   email
 * @param {String}   password
 * @param {Function} next
 */
function createUser (_user, next) {
  // let accessToken = generateToken()
  let password = _user.password
  delete _user.password

  // Pick fields so we don't introduce malicious data into the database
  let fields = R.pick(sails.config.waterauth.local.fields, _user)

  return sails.models.user.create(fields, function (err, user) {
    if (err) {
      sails.log.error(err)
      if (err.code === 'E_VALIDATION') {
        return next(new SAError({originalError: err}))
      }
      return next(err)
    }

    sails.models.passport.create({
      protocol: 'local',
      password: password,
      user: user.id
      // accessToken: accessToken
    }, function (err, passport) {
      if (err) {
        if (err.code === 'E_VALIDATION') {
          err = new SAError({originalError: err})
        }

        return user.destroy(function (destroyErr) {
          return next(destroyErr || err)
        })
      }

      if (sails.config.waterauth.local.verifyEmail) {
        user.verifyEmail = true
      }

      return next(null, user)
    })
  })
}

/**
 * Update an user
 *
 * This method updates an user based on its id or username if id is not present
 * and assign the newly created user a local Passport.
 *
 * @param {String}   username
 * @param {String}   email
 * @param {String}   password
 * @param {Function} next
 */
function updateUser (_user, next) {
  let password = _user.password
  delete _user.password

  let userFinder = _user.hasOwnProperty('id') ? { id: _user.id } : { username: _user.username }

  return sails.models.user.update(userFinder, _user, function (err, user) {
    if (err) {
      sails.log.error(err)
      if (err.code === 'E_VALIDATION') {
        return next(new SAError({ originalError: err }))
      }
      return next(err)
    }
    // Update retrieves an array
    user = user[0]
    // Check if password has a string to replace it
    if (!!password) {
      sails.models.passport.findOne({
        protocol: 'local',
        user: user.id
      }, function (err, pp) {
        if (err) {
          return next(err)
        }
        pp.password = password
        pp.save(function (err2, pp2) {
          if (err2) {
            if (err2.code === 'E_VALIDATION') {
              err2 = new SAError({ originalError: err2 })
            }
            return next(err2)
          }
          return next(null, user)
        })
      })
    } else {
      return next(null, user)
    }
  })
}

/**
 * Assign local Passport to user
 *
 * This function can be used to assign a local Passport to a user who doens't
 * have one already. This would be the case if the user registered using a
 * third-party service and therefore never set a password.
 *
 * @param {Object}   req
 * @param {Object}   res
 * @param {Function} next
 */
function connect (req, res, next) {
  let user = req.user
  let password = req.param('password')
  let Passport = sails.models.passport
  let accessToken = generateToken()

  Passport.findOne({
    protocol: 'local',
    user: user.id
  }, function (err, passport) {
    if (err) {
      return next(err)
    }

    if (!passport) {
      Passport.create({
        protocol: 'local',
        password: password,
        user: user.id,
        accessToken: accessToken
      }, function (err, passport) {
        return next(err, user)
      })
    } else {
      return next(null, user)
    }
  })
}

/**
 * Validate a login request
 *
 * Looks up a user using the supplied identifier (email or username) and then
 * attempts to find a local Passport associated with the user. If a Passport is
 * found, its password is checked against the password supplied in the form.
 *
 * @param {Object}   req
 * @param {string}   identifier
 * @param {string}   password
 * @param {Function} next
 */
function login (req, identifier, password, next) {
  let isEmail = validateEmail(identifier)
  let query = {}

  if (isEmail) {
    query.email = identifier
  } else {
    query.username = identifier
  }

  sails.models.user.findOne(query, function (err, user) {
    if (err) {
      return next(err)
    }

    if (!user) {
      if (isEmail) {
        req.flash('error', 'Error.Passport.Email.NotFound')
      } else {
        req.flash('error', 'Error.Passport.Username.NotFound')
      }

      return next({code: 'E_CREDENTIALS_MISSING'}, false)
    }

    sails.models.passport.findOne({
      protocol: 'local',
      user: user.id
    }, function (err, pp) {
      if (err) {
        return next(err)
      }
      if (pp) {
        pp.validatePassword(password, function (err, res) {
          if (err) {
            return next(err)
          }

          if (!res) {
            req.flash('error', 'Error.Passport.Password.Wrong')
            return next({code: 'E_CREDENTIALS_BAD'}, false)
          } else if (sails.config.waterauth.local.verifyEmail) {
            return sails.models.verify.findOne({user: user.id})
            .then(verify => {
              if (!verify || !verify.verified) {
                req.flash('error', 'Error.Passport.Email.Verify')
                return next({code: 'E_EMAIL_VERIFY'}, false)
              }
              return next(null, user, pp)
            })
            .catch(err => next(err))
          } else {
            return next(null, user, pp)
          }
        })
      } else {
        req.flash('error', 'Error.Passport.Password.NotSet')
        return next({code: 'E_CREDENTIALS_MISSING'}, false)
      }
    })
  })
}

module.exports = {
  register: createUser,
  update: updateUser,
  createUser,
  updateUser,
  connect,
  login
}
