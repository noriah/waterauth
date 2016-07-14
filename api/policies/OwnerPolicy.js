'use strict'
var R = require('ramda')
/**
 * TODO - this is setting createdBy, not owner.
 * The comment below, and the name of this file/function is confusing to me
 * Ensure that the 'owner' property of an Object is set upon creation.
 */

function setOwner (id, row) {
  row.createdBy = id
  row.owner = id
}

module.exports = function OwnerPolicy (req, res, next) {
  // sails.log('OwnerPolicy()')
  if (!req.user || !req.user.id) {
    req.logout()
    return res.send(500, new Error('req.user is not set'))
  }

  /*
  sails.log.verbose('OwnerPolicy user', req.user)
  sails.log.verbose('OwnerPolicy method', req.method)
  sails.log.verbose('OwnerPolicy req.body', req.body)
  */

  // langateam/sails-permissions#233
  // Not really needed as the model definition will almost always be there
  // Only time its needed is when the model is inserted into the cache programatically
  if (req.options.modelDefinition !== undefined && req.options.modelDefinition.autoCreatedBy === false) {
    // sails.log.verbose('OwnerPolicy hasOwnershipPolicy: false')
    return next()
  }

  if (req.method === 'POST') {
    // req.body || (req.body = { })

    // langateam/sails-permissions#229
    if (R.is(Array, req.body)) {
      R.forEach(row => setOwner(req.user.id, row), req.body)
    } else {
      setOwner(req.user.id, req.body)
    }
  }

  // sails.log.verbose('OwnerPolicy req.model', req.model)
  next()
}
