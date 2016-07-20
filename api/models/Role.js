'use strict'
/**
 * @module Role
 *
 * @description
 *   Roles endow Users with Permissions. Exposes Postgres-like API for
 *   resolving granted Permissions for a User.
 *
 * @see <http://www.postgresql.org/docs/9.3/static/sql-grant.html>
 */

function setRoleIdentity (role, next) {
  role.identity = role.name.toLowerCase()
  next()
}

module.exports = {
  autoCreatedBy: false,

  description: 'Confers `Permission` to `User`',

  attributes: {
    name: {
      type: 'string',
      alpha: true,
      index: true,
      notNull: true,
      unique: true
    },
    identity: {
      type: 'string'
    },
    description: {
      type: 'string'
    },
    users: {
      collection: 'User',
      via: 'roles'
    },
    active: {
      type: 'boolean',
      defaultsTo: true,
      index: true
    },
    permissions: {
      collection: 'Permission'
    }
  },

  beforeCreate: [
    setRoleIdentity
  ],

  beforeUpdate: [
    setRoleIdentity
  ]
}
