'use strict'

module.exports = {

  autoUpdatedAt: false,
  autoCreatedAt: false,

  attributes: {
    user: {
      model: 'user'
    },

    role: {
      model: 'role'
    }
  }
}
