'use strict'

/** @module User */
module.exports = {

  autoCreatedBy: false,
  autoUpdatedAt: false,

  connection: 'local_mongoDB_auth',

  attributes: {
    remoteAddress: { type: 'string' },

    jsonWebToken: { model: 'jwt' }
  }
}
