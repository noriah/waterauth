'use strict'
var crypto = require('crypto')
var base64URL = require('base64url')
var SAError = require('../../../lib/error/SAError.js')

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

var EMAIL_REGEX = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i

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
  var accessToken = generateToken()
  var password = _user.password
  delete _user.password

  return sails.models.user.create(_user, function (err, user) {
    if (err) {
      sails.log(err)

      if (err.code === 'E_VALIDATION') {
        return next(new SAError({originalError: err}))
      }

      return next(err)
    }

    sails.models.passport.create({
      protocol: 'local',
      password: password,
      user: user.id,
      accessToken: accessToken
    }, function (err, passport) {
      if (err) {
        if (err.code === 'E_VALIDATION') {
          err = new SAError({originalError: err})
        }

        return user.destroy(function (destroyErr) {
          next(destroyErr || err)
        })
      }

      next(null, user)
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
  var password = _user.password
  delete _user.password

  var userFinder = _user.hasOwnProperty('id') ? { id: _user.id } : { username: _user.username }

  return sails.models.user.update(userFinder, _user, function (err, user) {
    if (err) {
      sails.log(err)

      if (err.code === 'E_VALIDATION') {
        return next(new SAError({ originalError: err }))
      }

      return next(err)
    }
    // Update retrieves an array
    user = user[0]
    // Check if password has a string to replace it
    if (!password) {
      sails.models.passport.findOne({
        protocol: 'local',
        user: user.id
      }, function (err, pp) {
        pp.password = password
        pp.save(function (err2, pp2) {
          if (err2) {
            if (err2.code === 'E_VALIDATION') {
              err2 = new SAError({ originalError: err2 })
            }
            next(err2)
          }
          next(null, user)
        })
      })
    } else {
      next(null, user)
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
  var user = req.user
  var password = req.param('password')
  var Passport = sails.models.passport

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
        user: user.id
      }, function (err, passport) {
        next(err, user)
      })
    } else {
      next(null, user)
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
  var isEmail = validateEmail(identifier)
  var query = {}

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

      return next(null, false)
    }

    sails.models.passport.findOne({
      protocol: 'local',
      user: user.id
    }, function (err, pp) {
      if (pp) {
        pp.validatePassword(password, function (err, res) {
          if (err) {
            return next(err)
          }

          if (!res) {
            req.flash('error', 'Error.Passport.Password.Wrong')
            return next(null, false)
          } else {
            return next(null, user, pp)
          }
        })
      } else {
        req.flash('error', 'Error.Passport.Password.NotSet')
        return next(null, false)
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
