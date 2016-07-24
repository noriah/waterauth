'use strict'

const Promise = require('bluebird')
const R = require('ramda')

let Permission
let User

sails.after('hook:orm:loaded', () => {
  ({
    permission: Permission,
    user: User
  } = sails.models)
})

function validateValue (value) {
  if (R.isNil(value)) {
    return Promise.reject(new sails.utils.ServiceError(404, 'user not found in db', 'E_USER_NOT_FOUND'))
  }
  return Promise.resolve(value)
}

function getUser (username) {
  return User.findOne({
    username: R.toLower(username)
    // or: [
      // {id: username},
      // {identity: R.toLower(username)}
    // ]
  })
}

let UserService = {
  findUser: function findUser (username) {
    return getUser(username)
    .then(validateValue)
  },

  findUserRoles: function findUserRoles (username) {
    return getUser(username)
    .populate('roles')
    .then(validateValue)
    .then(user => user.roles)
  },

  findUserPermissions: function findUserRoles (username) {
    return getUser(username)
    .populate('roles', {active: true})
    .then(validateValue)
    .then(user => {
      return Permission.find({
        or: [
          {role: R.pluck('id', user.roles)},
          {user: user.id}
        ]
      })
    })
  }
}

module.exports = UserService
