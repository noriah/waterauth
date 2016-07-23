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

let UserService = {

  findUserRoles: function findUserRoles (userid) {

  }
}

module.exports = UserService
