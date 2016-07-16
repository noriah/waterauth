'use strict'

const R = require('ramda')

/**
 * Simplified version of sails/lib/hooks/blueprints/actionUtil
 * see: https://github.com/balderdashy/sails/blob/b4eed1775d01f436b263362180eb3f8447af1b87/lib/hooks/blueprints/actionUtil.js#L302
 */
// function parseController (req) {
//   return || req.options.controller
// }

/**
 * Query the Controller that is being acted upon, and set it on the req object.
 */
module.exports = function ControllerPolicy (req, res, next) {
  let controllerCache = sails.hooks.waterauth._controllerCache
  req.options.controllerIdentity = req.options.controller

  if (R.isEmpty(req.options.controllerIdentity)) {
    return next()
  }

  req.options.controllerDefinition = sails.controllers[req.options.controllerIdentity]
  req.controller = controllerCache[req.options.controllerIdentity]
  req.ctrlProperty = req.options.action

  if (R.is(Object, req.controller) && !R.isNil(req.controller.id)) {
    return next()
  }

  sails.log.warn('Controller [', req.options.controllerIdentity, '] not found in controller cache')

  // if the controller is not found in the cache for some reason, get it from the database
  sails.models.controller.findOne({ identity: req.options.controllerIdentity })
  .then(controller => {
    if (!R.is(Object, controller)) {
      req.options.unknownController = true

      controller = sails.controllers[req.options.controllerIdentity]
    }

    req.controller = controller
    next()
  })
  .catch(next)
}

// module.exports = function ControllerPolicy (req, res, next) {
//   if (req.options) {
//     if (req.options.controller && req.options.action) {
//       req.controller = req.options.controller
//       req.property = req.options.action
//       req.calledAction = `${req.options.controller}.${req.options.action}`
//     }
//   }
//   next()
// }
