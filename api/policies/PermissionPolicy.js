'use strict'

var PermissionService

sails.after('hook:orm:loaded', () => {
  ({
    services: {
      permissionservice: PermissionService
    }
  } = sails)
})

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
    httpMethod: req.method.toLowerCase(),
    ctrlProperty: req.ctrlProperty,
    user: req.user
  }

  // console.log(options)

  if (req.options.unknownController) {
    return next()
  }

  PermissionService.findControllerPermissions(options)
  .then(permissions => {
    sails.log.debug('PermissionPolicy:', permissions.length,
      'permissions grant', req.method,
      'on', `${req.controller.name}.${req.ctrlProperty}`,
      'for', req.user.username)

    if (!permissions || permissions.length === 0) {
      return res.send(403, { error: PermissionService.getErrorMessage(options) })
    }

    req.permissions = permissions

    next()
  })
}
