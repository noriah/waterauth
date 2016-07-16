'use strict'

const R = require('ramda')

var Jwt
var Permission
var Role
var User
var PermissionService
var TokenService

sails.after('hook:orm:loaded', () => {
  ({
    models: {
      jwt: Jwt,
      permission: Permission,
      role: Role,
      user: User
    },
    services: {
      permissionservice: PermissionService,
      tokenservice: TokenService
    }
  } = sails)
})

module.exports = {
  // https://github.com/waterlock/waterlock/blob/master/lib/controllers/actions/jwt.js
  newToken: function newToken (req, res, next) {
    TokenService.createToken(req, res, req.user)
    .then(tokenData => {
      return Jwt.create({
        token: tokenData.token,
        owner: req.user.id
      })
      .then(() => tokenData)
    })
    .then(tokenData => {
      if (sails.config.jwt.includeUser) {
        tokenData.user = req.user
      }

      if (sails.config.jwt.includeRoles) {
        return User.findOne(req.user.id)
        .populate('roles', {active: true})
        .then(user => {
          tokenData.roles = R.pluck('name', user.roles)
          return tokenData
        })
      }

      return tokenData
    })
    .then(tokenData => {
      return res.json(200, tokenData)
    })
    .catch(next)
  },

  tokenRoles: function tokenRoles (req, res, next) {
    User.findOne(req.user.id)
    // .populate('permissions')
    .populate('roles', {active: true})
    .then(user => {
      let roles = user.roles
      if (sails.config.environment === 'production') {
        roles = R.pluck('name', roles)
      }
      return res.json(200, roles)
    })
    .catch(next)
  },

  tokenPermissions: function tokenPermissions (req, res, next) {
    return PermissionService.findUserPermissions(req.user.id)
    .then(permissions => {
      return res.json(200, R.pluck('name', permissions))
    })
    .catch(next)
    // .then(permissions: )
    // User.findOne(req.user.id)
    // .populate('permissions')
    // .populate('roles')
    // .then(user => {
    //   return Role.find(R.map(R.prop('id'), user.roles))
    //   .populate('permissions')
    //   .then(roles => {
    //     return { user, roles }
    //   })
    // })
    // .then(({user, roles}) => {
    //   let permsList = R.append(user.permissions, R.unnest(R.map(R.prop('permissions'), roles)))
    //   let perms = R.zipObj(R.map(R.prop('id'), permsList), permsList)
    //   return res.json(200, perms)
    // })
    // .catch(next)
  }
}
