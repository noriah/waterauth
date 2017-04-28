'use strict'

const R = require('ramda')

let PermissionService = sails.services.permissionservice

/**
 * PermissionPolicy
 * @depends OwnerPolicy
 * @depends ControllerPolicy
 *
 * In order to proceed to the controller, the following verifications
 * must pass:
 * 1. User is logged in (handled previously by sails-auth sessionAuth policy)
 * 2. User has Permission to perform action on Controller
 * 3. User has Permission to perform action on Attribute (if applicable) [TODO]
 * 4. User is satisfactorily related to the Object's owner (if applicable)
 *
 * This policy verifies #1-2 here, before any controller is invoked. However
 * it is not generally possible to determine ownership relationship until after
 * the object has been queried. Verification of #4 occurs in RolePolicy.
 *
 * @param {Object}   req
 * @param {Object}   res
 * @param {Function} next
 */
module.exports = function PermissionPolicy (req, res, next) {
  let options = {
    controller: req.controller,
    httpMethod: req.method,
    ctrlProperty: req.ctrlProperty,
    user: req.user
  }

  // console.log(options)

  if (req.options.unknownController) {
    return next()
  }

  return PermissionService.findControllerGrants(options)
  .then(grants => {
    sails.log.debug('PermissionPolicy:', grants.length,
      'items grant', req.method,
      'on', `${req.controller.name}.${req.ctrlProperty}`,
      'for', req.user.username)

    if (!grants || grants.length === 0) {
      let e = {
        code: 'E_PERMISSION_DENIED',
        context: {
          httpMethod: options.httpMethod,
          controller: options.controller.name,
          property: options.ctrlProperty
        }
      }

      if (!sails.utils.isProduction()) {
        e.message = PermissionService.getErrorMessage(options)
      }
      return res.json(403, e)
    }

    req.grants = grants

    next()
  })
  .catch(err => {
    if (err instanceof sails.utils.ServiceError || !R.isNil(err.serviceError)) {
      return res.json(err.errNum, {code: err.code})
    }
    return next(err)
  })
}
