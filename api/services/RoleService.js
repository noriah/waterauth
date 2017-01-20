'use strict'

const Promise = require('bluebird')
const R = require('ramda')

let Role

sails.after('hook:orm:loaded', () => {
  ({
    role: Role
  } = sails.models)
})

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
    .then(sails.utils.validateValue)
  },

  findRoleUsers: function findRoleUsers (rolename) {
    return getRole(rolename)
    .populate('users')
    .then(sails.utils.validateValue)
  },

  findRolePermissions: function findRolePermissions (rolename) {
    return getRole(rolename)
    .populate('permissions')
    .then(sails.utils.validateValue)
  },

  addPermissionsToRole: function addPermissionsToRole (permissions, rolename) {
    return Promise.resolve({'msg': 'Not yet implementd'})
  },

  removePermissionsFromRole: function removePermissionsFromRole (permissions, rolename) {
    return Promise.resolve({'msg': 'Not yet implementd'})
  }
}

module.exports = RoleService
