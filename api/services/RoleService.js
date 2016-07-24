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
  findRole: function findRole (rolename) {
    return getRole(rolename)
    .then(validateValue)
  },

  findRoleUsers: function findRoleUsers (rolename) {
    return getRole(rolename)
    .populate('users')
    .then(validateValue)
  },

  findRolePermissions: function findRolePermissions (rolename) {
    return getRole(rolename)
    .populate('permissions')
    .then(validateValue)
  },

  addPermissionsToRole: function addPermissionsToRole (permissions, rolename) {
    return Promise.resolve({'msg': 'Not yet implementd'})
  },

  removePermissionsFromRole: function removePermissionsFromRole (permissions, rolename) {
    return Promise.resolve({'msg': 'Not yet implementd'})
  }
}

module.exports = RoleService
