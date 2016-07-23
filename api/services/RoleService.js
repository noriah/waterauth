'use strict'

const Promise = require('bluebird')
const R = require('ramda')
const ServiceError = require('../../lib/error/ServiceError')

let Permission
let Role
let User

sails.after('hook:orm:loaded', () => {
  ({
    permission: Permission,
    role: Role,
    user: User
  } = sails.models)
})

function getValue (name, req) {
  let roleName = req.param(name)
  return Promise.resolve(roleName)
}

let getRoleName = R.curry(getValue)('rolename')
let getUsername = R.curry(getValue)('username')

function validateValue (errNum, eMsg, eCode, value) {
  if (R.isNil(value)) {
    return Promise.reject(new ServiceError(errNum, eMsg, eCode))
  }
  return Promise.resolve(value)
}

let validateRoleValue = R.curry(validateValue)(404, 'role not found in db', 'E_ROLE_NOT_FOUND')
let validateUserValue = R.curry(validateValue)(404, 'user not found in db', 'E_USER_NOT_FOUND')

function getRole (roleName, isActive = true) {
  return Role.findOne({
    active: isActive,
    or: [
      {id: roleName},
      {identity: R.toLower(roleName)}
    ]
  })
}

function getPopulatedRole (req, populateName) {
  return getRoleName(req)
  .then(roleName => getRole(roleName).populate(populateName))
  .then(validateRoleValue)
}

function getUser (username) {
  return User.findOne({
    or: [
      {id: username},
      {username}
    ]
  })
}

let RoleService = {

  findUserRoles: function findUserRoles (userid) {

  }

  getRoleUsers: function getRoleUsers (req) {
    return getRoleName(req)
    .then(roleName => getRole(roleName).populate('users'))
    .then(validateRoleValue)
    .then(role => {
      if (sails.utils.isProduction()) {
        return {users: R.pluck('name', role.users)}
      }

      return {users: role.users}
    })
  },

  getRolePermissions: function getRolePermissions (req) {
    return getPopulatedRole(req, 'permissions')
    .then(role => {
      if (sails.utils.isProduction()) {
        return {permissions: R.pluck('name', role.permissions)}
      }

      return {permissions: role.permissions}
    })
  },

  addPermissionToRole: function addPermissionToRole (req) {

  },

  removePermissionFromRole: function removePermissionFromRole (req) {

  }
}

module.exports = RoleService
