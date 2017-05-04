'use strict'

const R = require('ramda')

let User

sails.after('hook:orm:loaded', () => {
  ({
    user: User
  } = sails.models)
})

function getUser (username) {
  return User.findOne({
    username: R.toLower(username)
  })
}

let UserService = {
  findUser: function findUser (username) {
    return getUser(username)
    .then(user => {
      if (!user) {
        return Promise.reject(
          new sails.utils.ServiceError(404, 'user not found', 'E_USER_NOT_FOUND')
        )
      }

      return user
    })
  },

  findUserRoles: function findUserRoles (username) {
    return getUser(username)
    .populate('roles')
    .then(user => {
      if (!user) {
        return Promise.reject(
          new sails.utils.ServiceError(404, 'user not found', 'E_USER_NOT_FOUND')
        )
      }

      return user.roles
    })
  },

  findUserPermissions: function findUserPermissions (username) {
    return getUser(username)
    .then(user => {
      if (!user) {
        return Promise.reject(
          new sails.utils.ServiceError(404, 'user not found', 'E_USER_NOT_FOUND')
        )
      }

      return sails.services.permissionservice.findUserPermissions(user.id)
    })
  }
}

module.exports = UserService
