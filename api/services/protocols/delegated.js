'use strict'

// const R = require('ramda')

module.exports = function delegatedProtocol (req, userprofile, next) {
  let query = {
    identifier: userprofile.id,
    protocol: 'delegated'
  }

  sails.services.passport.connect(req, query, userprofile, next)
}
