'use strict'

const crypto = require('crypto')
const base64URL = require('base64url')
const R = require('ramda')

let User
let PasswordReset

sails.after('hook:orm:loaded', () => {
  ({
    user: User,
    passwordreset: PasswordReset
  } = sails.models)
})

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
  let parts = [
    base64URL(crypto.randomBytes(28)),
    base64URL('' + Date.now()),
    base64URL(crypto.randomBytes(36))
  ]

  return R.join('-', parts)
}

let PasswordResetService = {}

PasswordResetService.sendResetEmail = function setupReset (data, next) {
  let identifier = data.identifier
  let isEmail = validateEmail(identifier)
  let query = {}

  if (isEmail) {
    query.email = identifier
  } else {
    query.username = identifier
  }

  return User.findOne(query, (err, user) => {
    if (err) {
      return next(err)
    }

    if (!user) {
      return next({code: 'E_USER_NOTFOUND', status: 404})
    }

    return PasswordReset.findOne({
      user: user.id,
      valid: true,
      used: false,
      createdAt: { '>=': new Date(Date.now() - 600000) }
    }, (err, reset) => {
      if (err) {
        return next(err)
      }

      if (!reset) {
        let token = generateToken()
        PasswordReset.create({
          user: user.id,
          token: token
        }, (err, reset) => {
          if (err) {
            return next(err)
          }

          return PasswordResetService.sendEmail(user.email, user, token, next)
        })
      } else {
        return PasswordResetService.sendEmail(user.email, user, reset.token, next)
      }
    })
  })
}

PasswordResetService.sendEmail = function sendEmail (email, user, token, next) {
  let url = sails.config.waterauth.local.resetPage
  if (R.isNil(url)) {
    url = sails.config.appUrl
    if (R.last(url) !== '/') {
      url = url + '/'
    }

    url = url + 'auth/reset/'
  }

  if (R.last(url) !== '/') {
    url = url + '/'
  }

  url = url + token

  let appName = sails.config.appName || 'SailsJS App'

  let subject = sails.config.waterauth.local.resetSubject
  if (R.isNil(subject)) {
    subject = appName + ' -- Password Reset'
  }

  let template = sails.config.waterauth.local.resetEmailTemplate || 'reset'

  sails.hooks.email.send(template, {
    appName: appName,
    firstName: user.firstName,
    lastName: user.lastName,
    resetURL: url
  }, {
    to: email,
    subject: subject
  }, function onSend (err) {
    if (err) {
      sails.log.error(err)
    } else {
      sails.log.debug('Reset email sent to ' + email)
    }
  })

  return next(null, true)
}

PasswordResetService.reset = function resetPassword (token, password, next) {
  return PasswordReset.findOne({token: token}, (err, reset) => {
    if (err) {
      return next(err)
    }

    if (!reset) {
      return next({code: 'E_TOKEN_NOTFOUND', status: 404})
    }

    if (reset.valid !== true) {
      return next({code: 'E_TOKEN_INVALID', status: 403})
    }

    if (reset.used === true) {
      return next({code: 'E_TOKEN_USED', status: 403})
    }

    if (reset.createdAt < new Date(Date.now() - 600000)) {
      return next({code: 'E_TOKEN_OLD', status: 403})
    }

    reset.used = true
    reset.save(err => {
      if (err) {
        return next(err)
      }
    })

    sails.services.passportservice.protocols.local.update({
      id: reset.user,
      password: password
    }, (err, user) => {
      if (err) {
        return next(err)
      }

      return next(null)
    })
  })
}

module.exports = PasswordResetService
