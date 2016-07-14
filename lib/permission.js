'use strict'

/**
 * Load all strategies defined in the Passport configuration
 *
 * For example, we could add this to our config to use the GitHub strategy
 * with permission to access a users email address (even if it's marked as
 * private) as well as permission to add and update a user's Gists:
 *
    github: {
      name: 'GitHub',
      protocol: 'oauth2',
      scope: [ 'user', 'gist' ]
      options: {
        clientID: 'CLIENT_ID',
        clientSecret: 'CLIENT_SECRET'
      }
    }
 *
 * For more information on the providers supported by PassportService.js, check out:
 * http://passportjs.org/guide/providers/
 *
 */
function loadStrategies () {
  var strategies = sails.config.passport

  R.forEach(key => {
    // var strategy = strategies[key]
    var options = { passReqToCallback: true }
    var Strategy

    if (key === 'local') {
      // Since we need to allow users to login using both usernames as well as
      // emails, we'll set the username field to something more generic.
      _.extend(options, { usernameField: 'identifier' })

      // Only load the local strategy if it's enabled in the config
      if (strategies.local) {
        Strategy = strategies[key].strategy

        PassportService.use(new Strategy(options, PassportService.protocols.local.login))
      }
    } else {
      var protocol = strategies[key].protocol
      var callback = strategies[key].callback

      if (!callback) {
        callback = path.join('auth', key, 'callback')
      }

      Strategy = strategies[key].strategy

      var baseUrl = ''
      if (sails.config.appUrl !== null) {
        baseUrl = sails.config.appUrl
      } else {
        sails.log.warn('Please add "appUrl" configuration value.')
        baseUrl = sails.getBaseurl()
      }

      switch (protocol) {
        case 'oauth':
        case 'oauth2':
          options.callbackURL = url.resolve(baseUrl, callback)
          break

        case 'openid':
          options.returnURL = url.resolve(baseUrl, callback)
          options.realm = baseUrl
          options.profile = true
          break
      }

      // Merge the default options with any options defined in the config. All
      // defaults can be overriden, but I don't see a reason why you'd want to
      // do that.
      _.extend(options, strategies[key].options)

      PassportService.use(new Strategy(options, PassportService.protocols[protocol]))
    }
  }, R.keys(strategies))
}
