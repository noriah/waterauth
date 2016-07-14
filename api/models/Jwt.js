'use strict'
/**
 * @module JWT
 *
 * @description
 */
module.exports = {
  autoCreatedBy: false,

  connection: 'local_mongoDB_auth',

  description: 'Specifies more granular limits on json web tokens',

  attributes: {

    token: { type: 'text', maxLength: 512 },
    uses: { collection: 'jwtuse', via: 'jsonWebToken' },

    owner: { model: 'user' },

    revoked: { type: 'boolean', defaultsTo: false }
  }
}
