'use strict'

const R = require('ramda')

let Permission
let User

sails.after('hook:orm:loaded', () => {
  ({
    permission: Permission,
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
    .then(sails.utils.validateValue)
  },

  findUserRoles: function findUserRoles (username) {
    return getUser(username)
    .populate('roles')
    .then(sails.utils.validateValue)
    .then(user => user.roles)
  },

  findUserPermissions: function findUserRoles (username) {
    return getUser(username)
    .populate('roles', {active: true})
    .then(sails.utils.validateValue)
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
