'use strict'

const Promise = require('bluebird')
const R = require('ramda')

let Role
let User

sails.after('hook:orm:loaded', () => {
  ({
    role: Role,
    user: User
  } = sails.models)
})

function validateValue (role) {
  if (!role) {
    return Promise.reject(
      new sails.utils.ServiceError(404, 'role not found', 'E_ROLE_NOT_FOUND')
    )
  }

  return role
}

function getRole (roleId, isActive = true) {
  return Role.findOne({
    active: isActive,
    id: roleId
  })
}

let RoleService = {

  /**
   * create a new role
   * @param options
   * @param options.name {string} - role name
   * @param options.description {string} - role description
   * @param options.users {array of user names} - optional array of user ids that have this role
   */
  createRole: function createRole (options) {
    let ok
    let query = {
      name: options.name,
      description: options.description
    }

    let search = { identity: R.toLower(options.name) }

    if (options.users) {
      ok = User.find({id: options.users})
      .then(users => {
        query.users = users
      })
    } else {
      ok = Promise.resolve()
    }

    return ok.then(() => Role.findOrCreate(search, query))
  },

  destroyRole: function destroyRole (roleId) {
    return Role.findOne(roleId)
    .then(validateValue)
    .then(role => {
      if (!role.removable) {
        return Promise.reject(
          new sails.utils.ServiceError(401, 'cant delete built in role', 'E_ROLE_BUILTIN')
        )
      }

      return Role.destroy(roleId)
    })
  },

  findRoleUsers: function findRoleUsers (roleId) {
    return getRole(roleId)
    .populate('users')
    .then(validateValue)
  },

  findRolePermissions: function findRolePermissions (roleId) {
    return sails.services.permissionservice.findRolePermissions(roleId)
  },

  /**
   * add one or more users to a particular role
   * @param userIds {string or string array} - list of names of users
   * @param roleId {string} - the name of the role that the users should be added to
   */
  addUsersToRole: function addUsersToRole (roleId, userIds) {
    if (R.isEmpty(userIds)) {
      return Promise.reject(new Error('One or more userIds must be provided'))
    }

    if (!R.is(Array, userIds)) {
      userIds = [userIds]
    }

    return Role.findOne(roleId)
    .populate('users')
    .then(validateValue)
    .then(role => {
      return User.find({id: userIds}, {select: ['id']})
      .then(users => {
        role.users.add(R.pluck('id', users))
        return role.save()
      })
    })
  },

  /**
   * remove one or more users from a particular role
   * @params userIds {string or string array} - name or list of names of users
   * @params roleId {string} - the name of the role that the users should be removed from
   */
  removeUsersFromRole: function removeUsersFromRole (roleId, userIds) {
    if (R.isEmpty(userIds)) {
      return Promise.reject(new Error('One or more userIds must be provided'))
    }

    roleId = R.toLower(roleId)

    if (!R.is(Array, userIds)) {
      userIds = [userIds]
    }

    return Role.findOne(roleId)
    .populate('users')
    .then(role => {
      return User.find({id: userIds}, {select: ['id']})
      .then(users => {
        R.forEach(user => {
          role.users.remove(user.id)
        }, users)
        return role.save()
      })
    })
  },

  addPermissionsToRole: function addPermissionsToRole (roleId, permissions) {
    return Promise.resolve({'msg': 'Not yet implementd'})
  },

  removePermissionsFromRole: function removePermissionsFromRole (roleId, permissions) {
    return Promise.resolve({'msg': 'Not yet implementd'})
  }
}

module.exports = RoleService
