'use strict'

// const R = require('ramda')

let User

sails.after('hook:orm:loaded', () => {
  ({
    user: User
  } = sails.models)
})

function validateValue (user) {
  if (!user) {
    return Promise.reject(
      new sails.utils.ServiceError(404, 'user not found', 'E_USER_NOT_FOUND')
    )
  }

  return user
}

function getUser (userId) {
  return User.findOne(userId)
}

let UserService = {

  findUserRoles: function findUserRoles (userId) {
    return getUser(userId)
    .populate('roles')
    .then(validateValue)
    .then(user => user.roles)
  },

  findUserPermissions: function findUserPermissions (userId) {
    return sails.services.permissionservice.findUserPermissions(userId)
  }
}

module.exports = UserService
