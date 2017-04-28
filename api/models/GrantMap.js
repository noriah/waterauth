'use strict'

const R = require('ramda')

/**
 * @module GrantMap
 *
 * @description
 *   The actions a Role is granted on a particular Model and its attributes
 */
module.exports = {
  autoCreatedBy: false,
  autoCreatedAt: false,
  autoUpdatedAt: false,

  description: 'Permission Mapping',

  attributes: {

    permission: {
      model: 'permission',
      required: true
    },

    editable: {
      type: 'boolean',
      defaultsTo: true
    },

    // type: {
    //   type: 'string',

    //   enum: [
    //     'controller',
    //     'model'
    //   ],
    //   defaultsTo: 'model',
    //   index: true
    // },

    relation: {
      type: 'string',
      enum: [
        'role',
        'owner',
        'user'
      ],
      defaultsTo: 'role',
      index: true,
      required: true
    },

    /**
     * The Role to which this Permission grants create, read, update, and/or
     * delete privileges.
     */
    role: {
      model: 'Role'
      // Validate manually
      // required: true
    },

    /**
     * The User to which this Permission grants create, read, update, and/or
     * delete privileges.
     */
    user: {
      model: 'User'
      // Validate manually
    },

    /**
     * A list of criteria.  If any of the criteria match the request, the action is allowed.
     * If no criteria are specified, it is ignored altogether.
     */
    criteria: {
      collection: 'Criteria',
      via: 'grants'
    }
  },

  afterValidate: [
    function validateOwnerCreateTautology (permission, next) {
  //     if (permission.relation === 'owner' && permission.action === 'create') {
  //       next(new Error('Creating a Permission with relation=owner and action=create is tautological'))
  //     }

      // if (permission.action === 'delete' && !R.isNil(permission.criteria) && R.filter(criteria => !R.isEmpty(criteria.blacklist), permission.criteria).length >= 0) {
      //   next(new Error('Creating a Permission with an attribute blacklist is not allowed when action=delete'))
      // }

      if (permission.relation === 'user' && permission.user === '') {
        next(new Error('A Permission with relation user MUST have the user attribute set'))
      }

      if (permission.relation === 'role' && permission.role === '') {
        next(new Error('A Permission with relation role MUST have the role attribute set'))
      }

      next()
    }
  ]
}
