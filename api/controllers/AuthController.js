'use strict'

/**
 * Authentication Controller
 */

var AuthService
var PassportService

sails.after('hook:orm:loaded', () => {
  ({
    services: {
      authservice: AuthService,
      passportservice: PassportService
    }
  } = sails)
})

module.exports = {

  /**
   * Log out a user and return them to the homepage
   *
   * Passport exposes a logout() function on req (also aliased as logOut()) that
   * can be called from any route handler which needs to terminate a login
   * session. Invoking logout() will remove the req.user property and clear the
   * login session (if any).
   *
   * For more information on logging out users in Passport.js, check out:
   * http://passportjs.org/guide/logout/
   *
   * @param {Object} req
   * @param {Object} res
   */
  logout: function logout (req, res, next) {
    req.logout()

    delete req.user
    delete req.session.passport
    req.session.authenticated = false

    if (!req.isSocket) {
      res.redirect(req.query.next || '/')
    } else {
      res.ok()
    }
  },

  /**
   * Create a third-party authentication endpoint
   *
   * @param {Object} req
   * @param {Object} res
   */
  provider: function provider (req, res) {
    PassportService.endpoint(req, res)
  },

  /**
   * Create a authentication callback endpoint
   *
   * This endpoint handles everything related to creating and verifying Pass-
   * ports and users, both locally and from third-aprty providers.
   *
   * Passport exposes a login() function on req (also aliased as logIn()) that
   * can be used to establish a login session. When the login operation
   * completes, user will be assigned to req.user.
   *
   * For more information on logging in users in Passport.js, check out:
   * http://passportjs.org/guide/login/
   *
   * @param {Object} req
   * @param {Object} res
   */
  callback: function callback (req, res) {
    let provider = req.param('provider')
    let action = req.param('action')

    function negotiateError (err) {
      if (action === 'register') {
        res.redirect('/register')
      } else if (action === 'login') {
        res.redirect('/login')
      } else if (action === 'disconnect') {
        res.redirect('back')
      } else {
        // make sure the server always returns a response to the client
        // i.e passport-local bad username/email or password
        res.send(403, err)
      }
    }

    PassportService.callback(req, res, (err, user) => {
      if (err || !user) {
        sails.log.warn('AuthController.callback', user, err)
        return negotiateError(err)
      }

      req.login(user, err => {
        if (err) {
          sails.log.warn(err)
          return negotiateError(err)
        }

        req.session.authenticated = true
        req.user = user

        sails.log.info('user', user.email, 'authenticated successfully')

        // Upon successful login, optionally redirect the user if there is a
        // `next` query param
        if (req.query.next) {
          let url = AuthService.buildCallbackNextUrl(req)
          return res.redirect(url)
        } else if (sails.config.passport[provider] && sails.config.passport[provider].next) {
          return res.redirect(sails.config.passport[provider].next)
        }

        // return res.redirect('/google-callback.html')
        return res.json(200, user)
      })
    })
  },

  /**
   * Disconnect a passport from a user
   *
   * @param {Object} req
   * @param {Object} res
   */
  disconnect: function disconnect (req, res) {
    PassportService.disconnect(req, res)
  }
}
