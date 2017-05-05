'use strict'

// const R = require('ramda')

/**
 * @module Permission
 *
 * @description
 *   The actions a Role is granted on a particular Model and its attributes
 */
module.exports = {
  autoCreatedBy: false,
  autoCreatedAt: false,
  autoUpdatedAt: false,

  description: [
    'Defines a particular `action` that a `Role` can perform on a `Model`.',
    'A `User` can perform an `action` on a `Model` by having a `Role` which',
    'grants the necessary `Permission`.'
  ].join(' '),

  attributes: {

    /**
     * The Model that this Permission applies to.
     */
    // model: {
    //   model: 'Model',
    //   required: false
    // },

    name: {
      type: 'string',
      index: true,
      unique: true,
      notNull: true
    },

    editable: {
      type: 'boolean',
      defaultsTo: true
    },

    description: {
      type: 'string',
      defaultsTo: 'A Permission'
    },

    grants: {
      collection: 'GrantMap',
      via: 'permission'
    }

    // type: {
    //   type: 'string',
    //   enum: [
    //     'controller',
    //     'normal'
    //   ],

    //   defaultsTo: 'normal',
    //   index: true
    // }

    // controller: {
    //   model: 'Controller'
    //   // required: true
    // },

    // httpMethod: {
    //   type: 'string',
    //   index: true,
    //   // notNull: true,

    //   enum: [
    //     'get',
    //     'post',
    //     'put',
    //     'delete'
    //   ]
    // },

    // ctrlProperty: {
    //   type: 'string',
    //   index: true
    //   // notNull: true
    // }

    // type: {
    //   type: 'string',

    //   enum: [
    //     'controller',
    //     'model'
    //   ],
    //   defaultsTo: 'model',
    //   index: true
    // },

  }

  // afterValidate: [
  //   // function validateControllerRequirement (permission, next) {
  //   //   if (permission.type === 'controller' && R.isNil(permission.controller)) {
  //   //     next(new Error('A Controller Permission requires a controller object'))
  //   //   }

  //   //   next()
  //   // }
  // ]
}
