'use strict'

const Promise = require('bluebird')
const R = require('ramda')

let Permission
let Role
let User

sails.after('hook:orm:loaded', () => {
  ({
    models: {
      permission: Permission,
      role: Role,
      user: User
    }
  } = sails)
})

let RoleService = {}

class RoleError extends Error {
  constructor (num, msg, code) {
    super(msg)
    this.roleError = true
    this.code = code
    this.errNum = num || 404
  }
}

function getRoleName (req) {
  let roleName = req.param('rolename')
  if (R.isNil(roleName) || R.isEmpty(roleName)) {
    return Promise.reject(new RoleError(404, 'roleName is empty', 'E_ROLE_NOT_FOUND'))
  }
  return Promise.resolve(roleName)
}

function validateRoleValue (role) {
  if (R.isNil(role)) {
    return Promise.reject(new RoleError(404, 'role not found in db', 'E_ROLE_NOT_FOUND'))
  }
  return Promise.resolve(role)
}

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

function getUsername (req) {
  let username = req.param('username')
  if (R.isNil(username) || R.isEmpty(username)) {
    return Promise.reject(new RoleError(404, 'username is empty', 'E_USER_NOT_FOUND'))
  }
  return Promise.resolve(username)
}

function validateUserValue (user) {
  if (R.isNil(user)) {
    return Promise.reject(new RoleError(404, 'user not found in db', 'E_USER_NOT_FOUND'))
  }
  return Promise.resolve(user)
}

function getUser (username) {
  return User.findOne({
    or: [
      {id: username},
      {username}
    ]
  })
}

RoleService.RoleError = RoleError

RoleService.addUserToRole = function addUserToRole (req) {
  return Promise.all([
    getRoleName(req)
    .then(getRole)
    .then(validateRoleValue),
    getUsername(req)
    .then(username => getUser(username).populate('roles'))
    .then(validateUserValue)
  ])
  .then(([role, user]) => {
    user.roles.add(role.id)
    return user.save()
    .then(user => {
      return {user}
    })
  })
}

RoleService.removeUserFromRole = function removeUserFromRole (req) {
  return Promise.all([
    getRoleName(req)
    .then(getRole)
    .then(validateRoleValue),
    getUsername(req)
    .then(username => getUser(username).populate('roles'))
    .then(validateUserValue)
  ])
  .then(([role, user]) => {
    user.roles.remove(role.id)
    return user.save()
    .then(user => {
      return {user}
    })
  })
}

RoleService.getRoleUsers = function getRoleUsers (req) {
  return getRoleName(req)
  .then(roleName => getRole(roleName).populate('users'))
  .then(validateRoleValue)
  .then(role => {
    if (sails.utils.isProduction()) {
      return {users: R.pluck('name', role.users)}
    }

    return {users: role.users}
  })
}

RoleService.getRolePermissions = function getRolePermissions (req) {
  return getPopulatedRole(req, 'permissions')
  .then(role => {
    if (sails.utils.isProduction()) {
      return {permissions: R.pluck('name', role.permissions)}
    }

    return {permissions: role.permissions}
  })
}

module.exports = RoleService
