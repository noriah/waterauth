'use strict'

/** @module User */
module.exports = {

  autoCreatedBy: false,
  autoUpdatedAt: false,

  attributes: {
    remoteAddress: { type: 'string' },

    jsonWebToken: { model: 'jwt' }
  }
}
