'use strict'

const R = require('ramda')

let ControllerService = sails.services.controllerservice
let PermissionService = sails.services.permissionservice

/**
 * RolePolicy
 * @depends PermissionPolicy
 * @depends ControllerPolicy
 *
 * Verify that User is satisfactorily related to the Object's owner.
 * By this point, we know we have some permissions related to the action and object
 * If they are 'owner' permissions, verify that the objects that are being accessed are owned by the current user
 */
module.exports = function RolePolicy (req, res, next) {
  let permissions = req.permissions
  let relations = R.groupBy(R.prop('relation'), permissions)
  let httpMethod = req.method
  let ctrlProperty = req.ctrlProperty

  // continue if there exist role Permissions which grant the asserted privilege
  if (!R.isEmpty(relations.role)) {
    return next()
  }
  if (req.options.unknownModel) {
    return next()
  }

  /*
   * This block allows us to filter reads by the owner attribute, rather than failing an entire request
   * if some of the results are not owned by the user.
   * We don't want to take this same course of action for an update or delete action, we would prefer to fail the entire request.
   * There is no notion of 'create' for an owner permission, so it is not relevant here.
   */
  // if (!R.contains(action, ['update', 'delete']) && req.options.modelDefinition.attributes.owner) {
  //   // Some parsing must happen on the query down the line,
  //   // as req.query has no impact on the results from PermissionService.findTargetObjects.
  //   // I had to look at the actionUtil parseCriteria method to see where to augment the criteria
  //   // langateam/sails-permissions#230
  //   req.params.where = req.params.all().where || {}
  //   req.params.where.owner = req.user.id
  //   req.query.owner = req.user.id
  //   R.is(Object, req.body) && (req.body.owner = req.user.id)
  // }

  PermissionService.findTargetObjects(req)
  .then(objects => {
      // PermissionService.isAllowedToPerformAction checks if the user has 'user' based permissions (vs role or owner based permissions)
    return PermissionService.isAllowedToPerformAction(objects, req.user, httpMethod, ctrlProperty, ControllerService.getTargetControllerName(req), req.body)
      .then(hasUserPermissions => {
        if (hasUserPermissions) {
          return next()
        }
        if (PermissionService.hasForeignObjects(objects, req.user)) {
          return res.send(403, {
            error: 'Cannot perform action [' + httpMethod + '] on foreign object'
          })
        }
        next()
      })
  })
  .catch(next)
}
