'use strict'

const Promise = require('bluebird')
const R = require('ramda')

let Role

sails.after('hook:orm:loaded', () => {
  ({
    role: Role
  } = sails.models)
})

function validateValue (value) {
  if (R.isNil(value)) {
    return Promise.reject(new sails.utils.ServiceError(404, 'role not found in db', 'E_ROLE_NOT_FOUND'))
  }
  return Promise.resolve(value)
}

function getRole (rolename, isActive = true) {
  return Role.findOne({
    active: isActive,
    identity: R.toLower(rolename)
    // or: [
      // {id: rolename},
      // {identity: R.toLower(rolename)}
    // ]
  })
}

let RoleService = {
  getRoleUsers: function getRoleUsers (rolename) {
    return getRole(rolename)
    .populate('users')
    .then(validateValue)
    .then(role => {
      let users = role.users
      if (sails.utils.isProduction()) {
        return {users: R.pluck('name', users)}
      }
      return {users}
    })
  },

  getRolePermissions: function getRolePermissions (rolename) {
    return getRole(rolename)
    .populate('permissions')
    .then(validateValue)
    .then(role => {
      let permissions = role.permissions
      if (sails.utils.isProduction()) {
        return {permissions: R.pluck('name', permissions)}
      }
      return {permissions}
    })
  },

  addPermissionsToRole: function addPermissionsToRole (permissions, rolename) {

  },

  removePermissionsFromRole: function removePermissionsFromRole (permissions, rolename) {

  }
}

module.exports = RoleService
