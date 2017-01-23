'use strict'

const crypto = require('crypto')
const base64URL = require('base64url')
const R = require('ramda')

let User
let Verify

sails.after('hook:orm:loaded', () => {
  ({
    user: User,
    verify: Verify
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

var VerificationService = {}

VerificationService.sendVerificationEmail = function sendNewEmail (data, next) {
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

    return Verify.findOne({user: user.id}, (err, verify) => {
      if (err) {
        return next(err)
      }

      if (!verify) {
        let token = generateToken()
        Verify.create({
          user: user.id,
          token: token
        }, (err, verify) => {
          if (err) {
            return next(err)
          }

          return VerificationService.sendEmail(user.email, user, token, next)
        })
      } else {
        return VerificationService.sendEmail(user.email, user, verify.token, next)
      }
    })
  })
}

VerificationService.resendEmail = function resendEmail (identifier, next) {
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

    return Verify.findOne({user: user.id}, (err, verify) => {
      if (err) {
        return next(err)
      }

      if (!verify) {
        return VerificationService.sendNewEmail(identifier, next)
      }

      let token = verify.token
      return VerificationService.sendEmail(user.email, user, token, next)
    })
  })
}

VerificationService.sendEmail = function sendEmail (email, user, token, next) {
  let url = sails.config.waterauth.local.verifyPage
  if (R.isNil(url)) {
    url = sails.config.appUrl
    if (R.last(url) !== '/') {
      url = url + '/'
    }
    url = url + 'auth/verify/'
  }

  if (R.last(url) !== '/') {
    url = url + '/'
  }

  url = url + token

  let appName = sails.config.appName || 'SailsJS App'

  let subject = sails.config.waterauth.local.verifySubject
  if (R.isNil(subject)) {
    subject = 'Welcome to ' + appName + ' -- Verify Email'
  }

  let template = sails.config.waterauth.local.emailTemplate || 'verify'

  sails.hooks.email.send(template, {
    appName: appName,
    firstName: user.firstName,
    lastName: user.lastName,
    verifyURL: url
  }, {
    to: email,
    subject: subject
  }, function onSend (err) {
    if (err) {
      sails.log.error(err)
    } else {
      sails.log.debug('Verification email sent to ' + email)
    }
  })

  return next(null, true)
}

VerificationService.verify = function verify (token, next) {
  return Verify.findOne({token: token}, (err, verify) => {
    if (err) {
      return next(err)
    }

    if (!verify) {
      return next({code: 'E_TOKEN_NOTFOUND', status: 404})
    }

    verify.verified = true
    verify.save(err => {
      if (err) {
        return next(err)
      }

      return next(null)
    })
  })
}

module.exports = VerificationService
