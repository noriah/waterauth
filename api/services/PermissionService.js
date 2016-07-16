'use strict'

var R = require('ramda')
// var _ = require('lodash')

var methodMap = {
  POST: 'create',
  GET: 'read',
  PUT: 'update',
  DELETE: 'delete'
}

var wlFilter = require('waterline-criteria')

var Controller
var Permission
var Role
var User

sails.after('hook:orm:loaded', () => {
  ({
    models: {
      controller: Controller,
      permission: Permission,
      role: Role,
      user: User
    }
  } = sails)
})

var PermissionService = {

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
   * TODO this will be less expensive when waterline supports a caching layer
   */
  findTargetObjects: function findTargetObjects (req) {
    // handle add/remove routes that have :parentid as the primary key field
    var originalId
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
  findControllerPermissions: function findControllerPermissions (options) {
    // var httpMethod = PermissionService.getMethod(options.httpMethod)

    // console.log('findControllerPermissions options', options)
    // console.log('findControllerPermissions httpMethod', httpMethod)

    return User.findOne(options.user.id)
    .populate('roles', {active: true})
    .then(function (user) {
      // console.log(user)
      let permissionCriteria = {
        controller: options.controller.id,
        httpMethod: options.httpMethod,
        ctrlProperty: options.ctrlProperty,
        or: [
          { role: R.pluck('id', user.roles) },
          { user: user.id }
        ]
      }

      // console.log(permissionCriteria)

      return Permission.find(permissionCriteria).populate('criteria')
    })
  },

  findUserPermissions: function findUserPermissions (userid) {
    return User.findOne(userid)
    .populate('roles', {active: true})
    .then(user => {
      let permissionCriteria = {
        or: [
          { role: R.pluck('id', user.roles) },
          { user: user.id }
        ]
      }

      return Permission.find(permissionCriteria).populate('criteria')
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
  hasPassingCriteria: function hasPassingCriteria (objects, permissions, attributes, user) {
    // return success if there are no permissions or objects
    if (R.isEmpty(permissions) || R.isEmpty(objects)) return true

    if (!R.is(Array, objects)) {
      objects = [objects]
    }

    var criteria = permissions.reduce((memo, perm) => {
      if (perm) {
        if (!perm.criteria || perm.criteria.length === 0) {
          // If a permission has no criteria then it passes for all cases
          // (like the admin role)
          memo = memo.concat([{where: {}}])
        } else {
          memo = memo.concat(perm.criteria)
        }

        // if (perm.relation === 'owner') {
        //   perm.criteria.forEach(criteria2 => {
        //     criteria2.owner = true
        //   })
        // }
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
        var match = wlFilter([obj], {
          where: criteria2.where
        }).results
        var hasUnpermittedAttributes = PermissionService.hasUnpermittedAttributes(attributes, criteria2.blacklist)
        // var hasOwnership = true // edge case for scenario where a user has some permissions that are owner based and some that are role based
        // if (criteria2.owner) {
        //   hasOwnership = !PermissionService.isForeignObject(user)(obj)
        // }
        // && hasOwnership
        return match.length === 1 && !hasUnpermittedAttributes
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
    var user = options.user.email || options.user.username
    return `User ${user} is not permitted to ${options.httpMethod} ${options.controller.name}.${options.ctrlProperty}`
  },

  /**
   * Given an action, return the CRUD method it maps to.
   */
  getMethod: function getMethod (method) {
    return methodMap[method]
  },

  /**
   * create a new role
   * @param options
   * @param options.name {string} - role name
   * @param options.permissions {permission object, or array of permissions objects}
   * @param options.permissions.controller {string} - the name of the controller that the permission is associated with
   * @param options.permissions.criteria - optional criteria object
   * @param options.permissions.criteria.where - optional waterline query syntax object for specifying permissions
   * @param options.permissions.criteria.blacklist {string array} - optional attribute blacklist
   * @param options.users {array of user names} - optional array of user ids that have this role
   */
  createRole: function createRole (options) {
    var ok = Promise.resolve()
    var permissions = options.permissions

    if (!R.is(Array, permissions)) {
      permissions = [permissions]
    }

    // look up the controller id based on the controller name for each permission, and change it to an id
    ok = ok.then(() => {
      return Promise.all(permissions.map(permission => {
        return Controller.findOne({ name: permission.controller })
        .then(controller => {
          permission.controller = controller.id
          return permission
        })
      }))
    })

    // look up user ids based on usernames, and replace the names with ids
    ok = ok.then(permissions => {
      if (options.users) {
        return User.find({ username: options.users })
        .then(users => {
          options.users = users
        })
      }
    })

    ok = ok.then(users => Role.create(options))

    return ok
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
   * @param options.criteria - optional criteria object
   * @param options.criteria.where - optional waterline query syntax object for specifying permissions
   * @param options.criteria.blacklist {string array} - optional attribute blacklist
   */
  grant: function grant (permissions) {
    if (!R.is(Array, permissions)) {
      permissions = [permissions]
    }

    // look up the controllers based on name, and replace them with ids
    var ok = Promise.all(permissions.map(permission => {
      var findRole = permission.role ? Role.findOne({
        name: permission.role
      }) : null
      var findUser = permission.user ? User.findOne({
        username: permission.user
      }) : null
      return Promise.all([findRole, findUser, Controller.findOne({
        name: permission.controller
      })])
      .then(([role, user, controller]) => {
        permission.controller = controller.id
        if (role && role.id) {
          permission.role = role.id
        } else if (user && user.id) {
          permission.user = user.id
        } else {
          return Promise.reject(new Error('no role or user specified'))
        }
      })
    }))

    ok = ok.then(() => Permission.create(permissions))

    return ok
  },

  // langateam/sails-permissions#205
  // Performs checks first so the DB doesn't fill with duplicates
  grantRole: function grantRole (options) {
    let httpMethod = options.httpMethod
    let ctrlProperty = options.ctrlProperty
    let controller = options.controller
    let role = options.role
    var where
    var blacklist
    if (typeof options.criteria !== 'undefined' && options.criteria) {
      where = options.critera.where
      blacklist = options.criteria.blacklist
    }

    return PermissionService.findRolePermission(httpMethod, ctrlProperty, controller, role, where, blacklist)
    .then(result => {
      if (typeof result === 'undefined' || !result) {
        let criteria = {}
        criteria.where = where
        criteria.blacklist = blacklist

        if ((typeof criteria.blacklist === 'undefined' || !criteria.blacklist) && (typeof criteria.where === 'undefined' || !criteria.where)) {
          criteria = undefined
        }

        return PermissionService.grant({
          httpMethod: httpMethod,
          ctrlProperty: ctrlProperty,
          controller: controller,
          role: role,
          criteria: criteria
        })
      } else {
        return result
      }
    })
  },

  findRolePermission: function findRolePermission (httpMethod, ctrlProperty, controller, role, where, blacklist) {
    let relation = 'role'
    return Controller.findOneByName(controller).then(controller2 => {
      return Role.findOneByName(role).then(role2 => {
        if (typeof controller2 === 'undefined' || !controller2 || typeof role2 === 'undefined' || !role2) {
          return Promise.reject(new Error(`Role/Controller missing. Controller: '${controller2}' + Role: '${role2}'`))
        } else {
          var promise = Permission.findOne({
            httpMethod: httpMethod,
            ctrlProperty: ctrlProperty,
            controller: controller2.id,
            role: role2.id,
            relation: relation})
          var criteria = {}
          var hasCriteria = false

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
   * add one or more users to a particular role
   * TODO should this work with multiple roles?
   * @param usernames {string or string array} - list of names of users
   * @param rolename {string} - the name of the role that the users should be added to
   */
  addUsersToRole: function addUsersToRole (usernames, rolename) {
    if (R.isEmpty(usernames)) {
      return Promise.reject(new Error('One or more usernames must be provided'))
    }

    if (!R.is(Array, usernames)) {
      usernames = [usernames]
    }

    return Role.findOne({ name: rolename })
    .populate('users')
    .then(role => {
      return User.find({ username: usernames })
      .then(users => {
        role.users.add(R.pluck('id', users))
        return role.save()
      })
    })
  },

  /**
   * remove one or more users from a particular role
   * TODO should this work with multiple roles
   * @params usernames {string or string array} - name or list of names of users
   * @params rolename {string} - the name of the role that the users should be removed from
   */
  removeUsersFromRole: function removeUsersFromRole (usernames, rolename) {
    if (R.isEmpty(usernames)) {
      return Promise.reject(new Error('One or more usernames must be provided'))
    }

    if (!R.is(Array, usernames)) {
      usernames = [usernames]
    }

    return Role.findOne({
      name: rolename
    })
    .populate('users')
    .then(function (role) {
      return User.find({
        username: usernames
      }, {
        select: ['id']
      }).then(function (users) {
        users.map(function (user) {
          role.users.remove(user.id)
        })
        return role.save()
      })
    })
  },

  /**
   * revoke permission from role
   * @param options
   * @param options.role {string} - the name of the role related to the permission.  This, or options.user should be set, but not both.
   * @param options.user {string} - the name of the user related to the permission.  This, or options.role should be set, but not both.
   * @param options.controller {string} - the name of the controller for the permission
   * @param options.ctrlProperty {string} - the name of the controller function for the permission
   * @param options.httpMethod {string} - the name of the action for the permission
   * @param options.relation {string} - the type of the relation (owner or role)
   */
  revoke: function revoke (options) {
    var findRole = options.role ? Role.findOne({
      name: options.role
    }) : null
    var findUser = options.user ? User.findOne({
      username: options.user
    }) : null
    var ok = Promise.all([findRole, findUser, Controller.findOne({
      name: options.controller
    })])

    ok = ok.then(([ role, user, controller ]) => {
      var query = {
        controller: controller.id,
        httpMethod: options.httpMethod,
        ctrlProperty: options.ctrlProperty,
        relation: options.relation
      }

      if (role && role.id) {
        query.role = role.id
      } else if (user && user.id) {
        query.user = user.id
      } else {
        return Promise.reject(new Error('You must provide either a user or role to revoke the permission from'))
      }

      return Permission.destroy(query)
    })

    return ok
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
    return obj => new Promise((resolve, reject) => {
      Controller.findOne({ identity: controller })
      .then(controller2 => {
        return Permission.find({
          controller: controller2.id,
          ctrlProperty: ctrlProperty,
          httpMethod: httpMethod,
          relation: 'user',
          user: user
        })
        .populate('criteria')
      })
      .then(permission => {
        if (permission.length > 0 && PermissionService.hasPassingCriteria(obj, permission, body)) {
          resolve(true)
        } else {
          resolve(false)
        }
      })
      .catch(reject)
    })
  }
}

module.exports = PermissionService
