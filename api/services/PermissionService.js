'use strict'

const R = require('ramda')
// var _ = require('lodash')
const Promise = require('bluebird')

const methodMap = {
  POST: 'create',
  GET: 'read',
  PUT: 'update',
  DELETE: 'delete'
}

const wlFilter = require('waterline-criteria')

let Controller
let Permission
let GrantMap
let Role
let User

sails.after('hook:orm:loaded', () => {
  ({
    controller: Controller,
    permission: Permission,
    grantmap: GrantMap,
    role: Role,
    user: User
  } = sails.models)
})

function validateUserRecord (user) {
  if (!user) {
    return Promise.reject(
      new sails.utils.ServiceError(404, 'user not found', 'E_USER_NOT_FOUND')
    )
  }

  return user
}

function validateRoleRecord (role) {
  if (!role) {
    return Promise.reject(
      new sails.utils.ServiceError(404, 'role not found', 'E_ROLE_NOT_FOUND')
    )
  }

  return role
}

function validatePermissionRecord (permission) {
  if (!permission) {
    return Promise.reject(
      new sails.utils.ServiceError(404, 'permission not found', 'E_PERM_NOT_FOUND')
    )
  }

  return permission
}

let PermissionService = {

  /**
   * Given an object, or a list of objects, return true if the list contains
   * objects not owned by the specified user.
   */
  hasForeignObjects: function hasForeignObjects (objects, user) {
    if (!R.is(Array, objects)) {
      return PermissionService.isForeignObject(user.id)(objects)
    }
    return R.any(PermissionService.isForeignObject(user.id), objects)
  },

  /**
   * Return whether the specified object is NOT owned by the specified user.
   */
  isForeignObject: function isForeignObject (owner) {
    return object => object.owner !== owner
      // sails.log.verbose('object', object)
      // sails.log.verbose('object.owner: ', object.owner, ', owner:', owner)
      // return
    // }
  },

  /**
   * Find objects that some arbitrary action would be performed on, given the
   * same request.
   *
   * @param options.controller
   * @param options.query
   *
   */
  findTargetObjects: function findTargetObjects (req) {
    // handle add/remove routes that have :parentid as the primary key field
    let originalId
    if (req.params.parentid) {
      originalId = req.params.id
      req.params.id = req.params.parentid
    }

    return new Promise((resolve, reject) => {
      sails.hooks.blueprints.middleware.find(req, {
        ok: resolve,
        serverError: reject,
        // this isn't perfect, since it returns a 500 error instead of a 404 error
        // but it is better than crashing the app when a record doesn't exist
        notFound: reject
      })
    })
    .then(result => {
      if (originalId !== undefined) {
        req.params.id = originalId
      }
      return result
    })
  },

  /**
   * Query Permissions that grant privileges to a role/user on an action for a
   * controller.
   *
   * @param options.httpMethod
   * @param options.ctrlProperty
   * @param options.controller
   * @param options.user
   */
  findControllerGrants: function findControllerGrants (options) {
    let name = R.join('.', [
      options.controller.identity,
      options.ctrlProperty,
      options.httpMethod
    ])

    return PermissionService.getPermission(name)
    .then(validatePermissionRecord)
    .then(permission => {
      return User.findOne(options.user.id)
      .populate('roles', {active: true})
      .then(user => {
        return GrantMap.find({
          permission: permission.id,
          or: [
            { role: R.pluck('id', user.roles) },
            { user: user.id }
          ]
        })
        .populate('criteria')
      })
    })
  },

  findUserPermissions: function findUserPermissions (userId) {
    return User.findOne(userId)
    .populate('roles', {active: true})
    .then(validateUserRecord)
    .then(user => {
      let permissionCriteria = {
        or: [
          { role: R.pluck('id', user.roles) },
          { user: user.id }
        ]
      }

      return GrantMap.find(permissionCriteria)
      .populate('permission')
      .populate('criteria')
    })
    .then(mappings => {
      mappings = R.map(map => {
        if (!map.permission) {
          return null
        }

        if (map.criteria) {
          map.permission.criteria = map.criteria
        }

        map.permission.isOwner = map.isOwner

        map.permission.relation = map.relation

        map.permission.grantId = map.id

        return map.permission
      }, mappings)

      mappings = R.filter(x => !R.isNil(x), mappings)

      return mappings
    })
  },

  findRolePermissions: function findRolePermissions (roleId) {
    return GrantMap.find({
      role: roleId,
      relation: 'role'
    })
    .populate('permission')
    .populate('criteria')
    .then(mappings => {
      mappings = R.map(map => {
        if (!map.permission) {
          return null
        }

        if (map.criteria) {
          map.permission.criteria = map.criteria
        }

        map.permission.isOwner = map.isOwner

        map.permission.relation = map.relation

        map.permission.grantId = map.id

        return map.permission
      }, mappings)

      mappings = R.filter(x => !R.isNil(x), mappings)

      return mappings
    })
  },

  /**
   * Given a list of objects, determine if they all satisfy at least one permission's
   * where clause/attribute blacklist combination
   *
   * @param {Array of objects} objects - The result of the query, or if the action is create,
   * the body of the object to be created
   * @param {Array of Permission objects} permissions - An array of permission objects
   * that are relevant to this particular user query
   * @param {Object} attributes - The body of the request, in an update or create request.
   * The keys of this object are checked against the permissions blacklist
   * @returns boolean - True if there is at least one granted permission that allows the requested action,
   * otherwise false
   */
  hasPassingCriteria: function hasPassingCriteria (objects, grants, attributes, user) {
    // return success if there are no permissions or objects
    if (R.isEmpty(grants) || R.isEmpty(objects)) return true

    if (!R.is(Array, objects)) {
      objects = [objects]
    }

    let criteria = grants.reduce((memo, grant) => {
      if (grant) {
        if (!grant.criteria || grant.criteria.length === 0) {
          // If a permission has no criteria then it passes for all cases
          // (like the admin role)
          memo = memo.concat([{where: {}}])
        } else {
          memo = memo.concat(grant.criteria)
        }

        if (grant.isOwner) {
          grant.criteria.forEach(criteria2 => {
            criteria2.owner = true
          })
        }
        return memo
      }
    }, [])

    if (!R.is(Array, criteria)) {
      criteria = [criteria]
    }

    if (R.isEmpty(criteria)) {
      return true
    }

    // every object must have at least one permission that has a passing criteria and a passing attribute check
    return objects.every(obj => {
      return criteria.some(criteria2 => {
        let match = wlFilter([obj], {
          where: criteria2.where
        }).results
        let hasUnpermittedAttributes = PermissionService.hasUnpermittedAttributes(attributes, criteria2.blacklist)
        var hasOwnership = true // edge case for scenario where a user has some permissions that are owner based and some that are role based
        if (criteria2.owner) {
          hasOwnership = !PermissionService.isForeignObject(user)(obj)
        }
        // && hasOwnership
        return match.length === 1 && !hasUnpermittedAttributes && hasOwnership
      })
    })
  },

  hasUnpermittedAttributes: function hasUnpermittedAttributes (attributes, blacklist) {
    if (R.isEmpty(attributes) || R.isNil(blacklist) || R.isEmpty(blacklist)) {
      return false
    }

    return R.intersection(blacklist, Object.keys(attributes)).length > 0
  },

  /**
   * This method is SUPER expensive. Dont use it often. Cache it if you use it
   */
  findUsersWithPermission: function findUsersWithPermission (permissionId) {
    return Permission.findOne(permissionId)
    .then(validatePermissionRecord)
    .then(perm => {
      let grantings
      return GrantMap.find({permission: perm.id})
      .populate('user')
      .populate('role')
      .then(grantMaps => {
        grantings = R.groupBy(R.prop('relation'), grantMaps)

        if (!R.isNil(grantings.user)) {
          grantings.user = R.pluck('user', grantings.user)
        } else {
          grantings.user = []
        }

        if (!R.isNil(grantings.role)) {
          grantings.role = R.map(perm2 => perm2.role.id, grantings.role)

          return Role.find(grantings.role)
          .populate('users')
          .then(roles => R.unnest(R.pluck('users', roles)))
        }

        return []
      })
      .then(users => {
        users = R.concat(users, grantings.user)
        users = R.uniqBy(R.prop('username'), users)
        return users
      })
    })
  },

  findRolesWithPermission: function findRolesWithPermission (permissionId) {
    return Permission.findOne(permissionId)
    .then(validatePermissionRecord)
    .then(perm => {
      return GrantMap.find({
        permission: perm.id,
        relation: 'role'
      })
      .populate('role')
      .then(R.pluck('role'))
    })
  },

  /**
   * Return true if the specified controller supports the ownership policy false
   * otherwise.
   */
  // hasOwnershipPolicy: function hasOwnershipPolicy (controller) {
  //   return controller.autoCreatedBy
  // },

  /**
   * Build an error message
   */
  getErrorMessage: function getErrorMessage (options) {
    let user = options.user.email || options.user.username
    return `User ${user} is not permitted to ${options.httpMethod} ${options.controller.name}.${options.ctrlProperty}`
  },

  /**
   * Given an action, return the CRUD method it maps to.
   */
  getMethod: function getMethod (method) {
    return methodMap[method]
  },

  createPermission: function createPermission (permission) {
    let description = permission.description || 'A Permission'
    let editable = !R.isNil(permission.editable) ? permission.editable : true
    let name = R.toLower(permission.name)
    let search = { name: name }
    let query = {
      name: name,
      editable: editable,
      description: description
    }

    return Permission.findOrCreate(search, query)
  },

  getPermission: function getPermission (name) {
    name = R.toLower(name)
    // console.log(name)
    return sails.models.permission.findOne({name: name})
  },

  /**
   *
   * @param options {permission object, or array of permissions objects}
   * @param options.role {string} - the role name that the permission is associated with,
   *                                either this or user should be supplied, but not both
   * @param options.user {string} - the user than that the permission is associated with,
   *                                either this or role should be supplied, but not both
   * @param options.controller {string} - the controller name that the permission is associated with
   * @param options.httpMethod {string} - the http action that the permission allows
   * @param options.ctrlProperty {string} - the controller function that the permission allows
   * @param options.name {string} - the name of the permission
   * @param options.criteria - optional criteria object
   * @param options.criteria.where - optional waterline query syntax object for specifying permissions
   * @param options.criteria.blacklist {string array} - optional attribute blacklist
   */
  grant: function grant (permissions) {
    if (!R.is(Array, permissions)) {
      permissions = [permissions]
    }

    // look up the controllers based on name, and replace them with ids
    return Promise.all(permissions.map(permission => {
      let p
      if (permission.permission) {
        p = Permission.findOne(permission.permission)
      } else if (permission.name) {
        p = PermissionService.getPermission(permission.name)
      }

      return p.then(validatePermissionRecord)
      .then(perm => {
        let findRole = null
        if (permission.role) {
          if (permission.role.id) {
            findRole = permission.role
          } else {
            findRole = Role.findOne(permission.role).then(validateRoleRecord)
          }
        }

        let findUser = null
        if (permission.user) {
          if (permission.user.id) {
            findUser = permission.user
          } else {
            findUser = User.findOne(permission.user).then(validateUserRecord)
          }
        }

        return Promise.all([findRole, findUser])
        .then(([role, user]) => {
          let editable = !R.isNil(permission.editable) ? permission.editable : true
          let isOwner = !R.isNil(permission.isOwner) ? permission.isOwner : false
          let query = {
            permission: perm.id,
            editable: editable,
            isOwner: isOwner
          }

          if (permission.criteria) {
            query.criteria = permission.criteria
          }

          if (role && role.id) {
            query.role = role.id
            query.relation = 'role'
          } else if (user && user.id) {
            query.user = user.id
            query.relation = 'user'
          } else {
            return Promise.reject(
              new sails.utils.ServiceError(400, 'Missing role or user value', 'E_MISSING_ARGUMENTS')
              // new Error('no role or user specified')
            )
          }

          return GrantMap.findOrCreate(query, query)
        })
      })
    }))
  },

  // langateam/sails-permissions#205
  // Performs checks first so the DB doesn't fill with duplicates
  grantRole: function grantRole (options) {
    let httpMethod = options.httpMethod
    let ctrlProperty = options.ctrlProperty
    let controller = options.controller
    let role = options.role
    let where
    let blacklist
    if (typeof options.criteria !== 'undefined' && options.criteria) {
      where = options.critera.where
      blacklist = options.criteria.blacklist
    }



    // return PermissionService.findRolePermission(httpMethod, ctrlProperty, controller, role, where, blacklist)
    // .then(result => {
    //   if (typeof result === 'undefined' || !result) {
    //     let criteria = {}
    //     criteria.where = where
    //     criteria.blacklist = blacklist

    //     if ((typeof criteria.blacklist === 'undefined' || !criteria.blacklist) && (typeof criteria.where === 'undefined' || !criteria.where)) {
    //       criteria = undefined
    //     }

    //     return PermissionService.grant({
    //       httpMethod: httpMethod,
    //       ctrlProperty: ctrlProperty,
    //       controller: controller,
    //       role: role,
    //       criteria: criteria
    //     })
    //   } else {
    //     return result
    //   }
    // })
  },

  findRolePermission: function findRolePermission (httpMethod, ctrlProperty, controller, role, where, blacklist) {
    let relation = 'role'
    return Controller.findOneByName(controller).then(controller2 => {
      return Role.findOneByName(role).then(role2 => {
        if (typeof controller2 === 'undefined' || !controller2 || typeof role2 === 'undefined' || !role2) {
          return Promise.reject(new Error(`Role/Controller missing. Controller: '${controller2}' + Role: '${role2}'`))
        } else {
          let promise = Permission.findOne({
            httpMethod: httpMethod,
            ctrlProperty: ctrlProperty,
            controller: controller2.id,
            role: role2.id,
            relation: relation})
          let criteria = {}
          let hasCriteria = false

          if (typeof blacklist !== 'undefined' && blacklist && blacklist.length > 0) {
            criteria.blacklist = blacklist
          }

          if (typeof where !== 'undefined' && where && where.length > 0) {
            criteria.where = where
          }

          if ((typeof criteria.blacklist !== 'undefined' && criteria.blacklist) || (typeof criteria.where !== 'undefined' && criteria.where)) {
            promise = promise.populate('criteria', criteria)
            hasCriteria = true
          }
          return promise.then(result => {
            if (hasCriteria && result.criteria.length === 0) {
              return undefined
            }

            return result
          })
        }
      })
    })
  },

  /**
   * revoke permission from role
   * @param options
   * @param options.permission {object} The permission id
   * @param options.role {string} - the id of the role related to the permission.  This, or options.user should be set, but not both.
   * @param options.user {string} - the id of the user related to the permission.  This, or options.role should be set, but not both.
   * @param options.relation {string} - the type of the relation (owner or role)
   */
  revoke: function revoke (options) {
    let permission = options.permission
    // let type = (permission.controller ? 'controller' : 'normal')
    // let permName
    // if (type === 'controller') {
      // permName = R.join('.', [
        // permission.controller, permission.ctrlProperty, permission.httpMethod
      // ])
    // } else {
    // permName = permission.name
    // }

    let findRole = null
    if (permission.role) {
      if (permission.role.id) {
        findRole = permission.role
      } else {
        findRole = Role.findOne(permission.role).then(validateRoleRecord)
      }
    }

    let findUser = null
    if (permission.user) {
      if (permission.user.id) {
        findUser = permission.user
      } else {
        findUser = User.findOne(permission.user).then(validateUserRecord)
      }
    }

    let ok = Promise.all([findRole, findUser, Permission.findOne(permission)])

    return ok.then(([role, user, perm]) => {
      if (!perm) {
        return Promise.resolve()
      }

      if (R.isNil(permission.isOwner)) {
        permission.isOwner = false
      }

      let query = {
        permission: perm.id,
        isOwner: permission.isOwner
      }

      if (permission.criteria) {
        query.criteria = permission.criteria
      }

      if (role && role.id) {
        query.role = role.id
        query.relation = 'role'
      } else if (user && user.id) {
        query.user = user.id
        query.relation = 'user'
      } else {
        return Promise.reject(
          new sails.utils.ServiceError(400, 'Missing role or user value', 'E_MISSING_ARGUMENTS')
        )
      }

      return GrantMap.destroy(query)
    })
  },

  /**
   * Check if the user (out of role) is granted to perform action on given objects
   * @param objects
   * @param user
   * @param httpMethod
   * @param ctrlProperty
   * @param controller
   * @param body
   * @returns {*}
   */
  isAllowedToPerformAction: function isAllowedToPerformAction (objects, user, httpMethod, ctrlProperty, controller, body) {
    if (!R.is(Array, objects)) {
      return PermissionService.isAllowedToPerformSingle(user.id, httpMethod, ctrlProperty, controller, body)(objects)
    }
    return Promise.all(objects.map(PermissionService.isAllowedToPerformSingle(user.id, httpMethod, ctrlProperty, controller, body)))
    .then(allowedArray => {
      return allowedArray.every(allowed => {
        return allowed === true
      })
    })
  },

  /**
   * Resolve if the user have the permission to perform this action
   * @param user
   * @param httpMethod
   * @param ctrlProperty
   * @param controller
   * @param body
   * @returns {Function}
   */
  isAllowedToPerformSingle: function isAllowedToPerformSingle (user, httpMethod, ctrlProperty, controller, body) {
    return obj => {
      let p1 = User.findOne(user)
      .populate('roles', {active: true})
      .then(validateUserRecord)

      let pName = R.join('.', [controller, ctrlProperty, httpMethod])
      let p2 = PermissionService.getPermission(pName)
      .then(validatePermissionRecord)

      return Promise.all([p1, p2])
      .then(([userObj, permObj]) => {
        return GrantMap.find({
          permission: permObj.id,
          or: [
            { role: R.pluck('id', userObj.roles) },
            { user: user.id }
          ]
        })
      })
      .then(grants => {
        if (grants.length > 0 && PermissionService.hasPassingCriteria(obj, grants, body)) {
          return true
        } else {
          return false
        }
      })
    }
  }
}

module.exports = PermissionService
