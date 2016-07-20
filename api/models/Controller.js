'use strict'
/**
 * @module Model
 *
 * @description
 *   Abstract representation of a Waterline Model.
 */
module.exports = {
  description: 'Represents a Waterline controller that a User can create, query, etc.',

  autoPK: true,
  autoCreatedBy: false,
  autoCreatedAt: false,
  autoUpdatedAt: false,

  attributes: {
    name: {
      type: 'string',
      notNull: true,
      unique: true
    },
    identity: {
      type: 'string',
      notNull: true
    },
    functions: {
      type: 'json'
    },
    permissions: {
      collection: 'Permission',
      via: 'controller'
    }
  }
}
