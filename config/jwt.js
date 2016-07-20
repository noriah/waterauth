'use strict'

// https://github.com/auth0/node-jsonwebtoken#jwtsignpayload-secretorprivatekey-options-callback

module.exports.jwt = {
  // https://www.fourmilab.ch/cgi-bin/Hotbits
  secret: process.env.TOKEN_SECRET || 'super-secret-value-here',

  expiry: {
    unit: 'days',
    length: 2
  },

  algorithm: 'HS512',
  audience: 'token-user',
  issuer: 'token-auth',
  subject: 'token-auth-token',

  maxTokensPerUser: 5,

  includeUser: false,

  includeRoles: false,

  includePermissions: false,

  trackTokens: true,

  clockTolerance: 10
}
