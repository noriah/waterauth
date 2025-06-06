'use strict'

const local = require('./local')
const basic = require('./basic')
const bearer = require('./bearer')
const delegated = require('./delegated')
const oauth = require('./oauth')
const oauth2 = require('./oauth2')
const openid = require('./openid')

/**
 * Authentication Protocols
 *
 * Protocols where introduced to patch all the little inconsistencies between
 * the different authentication APIs. While the local authentication strategy
 * is as straigt-forward as it gets, there are some differences between the
 * services that expose an API for authentication.
 *
 * For example, OAuth 1.0 and OAuth 2.0 both handle delegated authentication
 * using tokens, but the tokens have changed between the two versions. This
 * is accomodated by having a single `token` object in the Passport model that
 * can contain any combination of tokens issued by the authentication API.
 */
module.exports = {
  local,
  basic,
  bearer,
  delegated,
  oauth,
  oauth2,
  openid
}
