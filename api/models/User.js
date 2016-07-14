'use strict'
const R = require('ramda')
const crypto = require('crypto')

/** @module User */
module.exports = {
  connection: 'local_mongoDB_auth',

  attributes: {
    username: {
      type: 'string',
      unique: true,
      index: true,
      notNull: true
    },
    email: {
      type: 'email',
      unique: true,
      index: true
    },
    firstName: {
      type: 'string',
      index: true,
      notNull: true
    },
    tokens: {
      collection: 'Jwt',
      via: 'owner'
    },
    lastName: {
      type: 'string',
      index: true,
      notNull: true
    },
    passports: {
      collection: 'Passport',
      via: 'user'
    },
    roles: {
      collection: 'Role',
      via: 'users',
      dominant: true
    },
    // permissions: {
    //   collection: 'Permission',
    //   via: 'user'
    // },
    permissions: {
      Model: 'Permission'
    },

    getGravatarUrl: function getGravatarUrl () {
      let md5 = crypto.createHash('md5')
      md5.update(this.email || '')
      return `https://gravatar.com/avatar/${md5.digest('hex')}`
    },

    toJSON: function toJSON () {
      let user = this.toObject()
      delete user.password
      user.gravatarUrl = this.getGravatarUrl()
      return user
    }
  },

  beforeCreate: function beforeCreate (user, next) {
    if (R.isEmpty(user.username) || R.isNil(user.username)) {
      user.username = user.email
    }
    next()
  },

  /**
   * Attach default Role to a new User
   */
  afterCreate: [
    /* function setOwner (user, next) {
      sails.log.verbose('User.afterCreate.setOwner', user)
      sails.models.user
        .update({ id: user.id }, { owner: user.id })
        .then(function (user) {
          next()
        })
        .catch(function (e) {
          sails.log.error(e)
          next(e)
        })
    },*/
    function attachDefaultRole (user, next) {
      sails.log('User.afterCreate.attachDefaultRole', user)
      sails.models.user.findOne(user.id)
        .populate('roles')
        .then(_user => {
          user = _user
          return sails.models.role.findOne({ name: 'registered' })
        })
        .then(role => {
          user.roles.add(role.id)
          return user.save()
        })
        .then(updatedUser => {
          sails.log.silly(`role 'registered' attached to user ${user.username}`)
          next()
        })
        .catch(e => {
          sails.log.error(e)
          next(e)
        })
    }
  ],

  /**
   * Register a new User with a passport
   */
  register: function register (user) {
    return new Promise(function (resolve, reject) {
      sails.services.passportservice.protocols.local.createUser(user, function (error, created) {
        if (error) return reject(error)
        resolve(created)
      })
    })
  }
}
