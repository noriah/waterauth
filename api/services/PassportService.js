'use strict'

const R = require('ramda')
const _ = require('lodash')

let Passport
let User

sails.after('hook:orm:loaded', () => {
  ({
    passport: Passport,
    user: User
  } = sails.models)
})

/**
 * Passport Service
 *
 * A painless PassportService.js service for your Sails app that is guaranteed to
 * Rock Your Socks. It takes all the hassle out of setting up PassportService.js by
 * encapsulating all the boring stuff in two functions:
 *
 *   passport.endpoint()
 *   passport.callback()
 *
 * The former sets up an endpoint (/auth/:provider) for redirecting a user to a
 * third-party provider for authentication, while the latter sets up a callback
 * endpoint (/auth/:provider/callback) for receiving the response from the
 * third-party provider. All you have to do is define in the configuration which
 * third-party providers you'd like to support. It's that easy!
 *
 * Behind the scenes, the service stores all the data it needs within "Pass-
 * ports". These contain all the information required to associate a local user
 * with a profile from a third-party provider. This even holds true for the good
 * ol' password authentication scheme – the Authentication Service takes care of
 * encrypting passwords and storing them in Passports, allowing you to keep your
 * User model free of bloat.
 */

var PassportService = {
  passportLib: require('passport'),
  // Load authentication protocols
  protocols: require('./protocols')
}

/**
 * Connect a third-party profile to a local user
 *
 * This is where most of the magic happens when a user is authenticating with a
 * third-party provider. What it does, is the following:
 *
 *   1. Given a provider and an identifier, find a matching PassportService.
 *   2. From here, the logic branches into two paths.
 *
 *     - A user is not currently logged in:
 *       1. If a Passport wassn't found, create a new user as well as a new
 *          Passport that will be assigned to the user.
 *       2. If a Passport was found, get the user associated with the passport.
 *
 *     - A user is currently logged in:
 *       1. If a Passport wasn't found, create a new Passport and associate it
 *          with the already logged in user (ie. "Connect")
 *       2. If a Passport was found, nothing needs to happen.
 *
 * As you can see, this function handles both "authentication" and "authori-
 * zation" at the same time. This is due to the fact that we pass in
 * `passReqToCallback: true` when loading the strategies, allowing us to look
 * for an existing session in the request and taking action based on that.
 *
 * For more information on auth(entication|rization) in PassportService.js, check out:
 * http://passportjs.org/guide/authenticate/
 * http://passportjs.org/guide/authorize/
 *
 * @param {Object}   req
 * @param {Object}   query
 * @param {Object}   profile
 * @param {Function} next
 */
PassportService.connect = function connect (req, query, profile, next) {
  let user = { }

  req.session.tokens = query.tokens

  // Get the authentication provider from the query.
  query.provider = req.param('provider')

  // Use profile.provider or fallback to the query.provider if it is undefined
  // as is the case for OpenID, for example
  let provider = profile.provider || query.provider

  // If the provider cannot be identified we cannot match it to a passport so
  // throw an error and let whoever's next in line take care of it.
  if (!provider) {
    return next(new Error('No authentication provider was identified.'))
  }

  sails.log.debug('auth profile', profile.id, profile.provider, profile.emails[0].value || profile.username)

  // If the profile object contains a list of emails, grab the first one and
  // add it to the user.
  if (profile.emails && profile.emails[0]) {
    user.email = profile.emails[0].value
  }
  // If the profile object contains a username, add it to the user.
  if (R.has('username', profile)) {
    user.username = profile.username
  }

  if (R.has('givenName', profile.name)) {
    user.firstName = profile.name.givenName
  }

  if (R.has('familyName', profile.name)) {
    user.lastName = profile.name.familyName
  }

  if (R.has('displayName', profile)) {
    user.displayName = profile.displayName
  }

  // If neither an email or a username was available in the profile, we don't
  // have a way of identifying the user in the future. Throw an error and let
  // whoever's next in the line take care of it.
  if (!user.username && !user.email) {
    return next(new Error('Neither a username nor email was available'))
  }

  Passport.findOne({
    provider: provider,
    identifier: query.identifier.toString()
  }).then(function (pp) {
    if (!req.user) {
      // Scenario: A new user is attempting to sign up using a third-party
      //           authentication provider.
      // Action:   Create a new user and assign them a passport.
      if (!pp) {
        return User.create(user)
        .then(function (user2) {
          user = user2
          return Passport.create(_.extend({ user: user.id }, query))
        })
        .then(function (pp2) {
          return next(null, user)
        })
        .catch(next)

      // Scenario: An existing user is trying to log in using an already
      //           connected passport.
      // Action:   Get the user associated with the passport.
      } else {
        // If the tokens have changed since the last session, update them
        if (R.has('tokens', query) && query.tokens !== pp.tokens) {
          pp.tokens = query.tokens
        }

        // Save any updates to the Passport before moving on
        return pp.save().then(() => {
            // Fetch the user associated with the Passport
          return User.findOne(pp.user)
          .then(function (user2) {
            if (!user2) {
              // Scenario: An existing passport does not have a user.
              // Action:   Recreate the user
              return User.create(user)
            }

            return user2
          })
        })
        .then(function (user2) {
          return next(null, user2)
        })
        .catch(next)
      }
    } else {
      // Scenario: A user is currently logged in and trying to connect a new
      //           passport.
      // Action:   Create and assign a new passport to the user.
      if (!pp) {
        return Passport.create(_.extend({ user: req.user.id }, query))
        .then(function (pp2) {
          return next(null, req.user)
        })
        .catch(next)
      // Scenario: The user is a nutjob or spammed the back-button.
      // Action:   Simply pass along the already established session.
      } else {
        return next(null, req.user)
      }
    }
  })
  .catch(next)
}

/**
 * Create an authentication endpoint
 *
 * For more information on authentication in PassportService.js, check out:
 * http://passportjs.org/guide/authenticate/
 *
 * @param  {Object} req
 * @param  {Object} res
 */
PassportService.endpoint = function endpoint (req, res) {
  let strategies = sails.config.passport
  let provider = req.param('provider')
  let options = {}

  // If a provider doesn't exist for this endpoint, send the user back to the
  // login page
  if (!R.has(provider, strategies)) {
    return res.redirect('/login')
  }

  // Attach scope if it has been set in the config
  if (R.has('scope', strategies[provider])) {
    options.scope = strategies[provider].scope
  }

  // Redirect the user to the provider for authentication. When complete,
  // the provider will redirect the user back to the application at
  //     /auth/:provider/callback
  PassportService.passportLib.authenticate(provider, options)(req, res, req.next)
}

/**
 * Create an authentication callback endpoint
 *
 * For more information on authentication in PassportService.js, check out:
 * http://passportjs.org/guide/authenticate/
 *
 * @param {Object}   req
 * @param {Object}   res
 * @param {Function} next
 */
PassportService.callback = function callback (req, res, next) {
  let provider = req.param('provider', 'local')
  let action = req.param('action')

  sails.log.debug(provider, action)

  // PassportService.js wasn't really built for local user registration, but it's nice
  // having it tied into everything else.
  if (provider === 'local' && action !== undefined) {
    if (action === 'register' && !req.user) {
      PassportService.protocols.local.register(req, res, next)
    } else if (action === 'connect' && req.user) {
      PassportService.protocols.local.connect(req, res, next)
    } else if (action === 'disconnect' && req.user) {
      PassportService.protocols.local.disconnect(req, res, next)
    } else {
      return next(new Error('Invalid action'))
    }
  } else {
    if (action === 'disconnect' && req.user) {
      PassportService.disconnect(req, res, next)
    } else {
      // The provider will redirect the user to this URL after approval. Finish
      // the authentication process by attempting to obtain an access token. If
      // access was granted, the user will be logged in. Otherwise, authentication
      // has failed.
      PassportService.passportLib.authenticate(provider, next)(req, res, req.next)
    }
  }
}



/**
 * Disconnect a passport from a user
 *
 * @param  {Object} req
 * @param  {Object} res
 */
PassportService.disconnect = function disconnect (req, res, next) {
  let user = req.user
  let provider = req.param('provider')

  return Passport.findOne({
    provider: provider,
    user: user.id
  })
  .then(function (pp) {
    return Passport.destroy(pp.id)
  })
  .then(function (err) {
    next(err, user)
    return user
  })
  .catch(next)
}

PassportService.passportLib.serializeUser(function (user, next) {
  return next(null, user.id)
})

PassportService.passportLib.deserializeUser(function (id, next) {
  return User.findOne(id)
  .then(function (user) {
    next(null, user || null)
    return user
  })
  .catch(next)
})

module.exports = PassportService
