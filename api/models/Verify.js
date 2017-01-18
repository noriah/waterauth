'use strict'

module.exports = {
  autoUpdatedAt: false,
  autoCreatedAt: false,
  publishUpdates: false,

  attributes: {
    token: { type: 'string', index: true },
    user: { model: 'User', required: true, index: true },
    verified: { type: 'boolean', defaultsTo: false }
  }
}
