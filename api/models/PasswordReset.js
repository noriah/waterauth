'use strict'

/**
 * @module PasswordReset
 *
 */
module.exports = {
  autoCreatedBy: false,
  autoUpdatedAt: false,

  description: 'Password reset table',

  attributes: {

    valid: {
      type: 'boolean',
      defaultsTo: true
    },

    token: {
      type: 'string',
      index: true,
      unique: true,
      notNull: true
    },

    used: {
      type: 'boolean',
      defaultsTo: false
    },

    user: {
      model: 'User',
      index: true
    }
  }
}
