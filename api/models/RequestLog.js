'use strict'
/**
* RequestLog.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {
  autoPK: false,
  autoCreatedBy: false,
  autoUpdatedAt: false,

  attributes: {
    id: {
      type: 'string',
      primaryKey: true
    },
    ipAddress: {
      type: 'string'
    },
    url: {
      type: 'string'
      // url: true
    },
    method: {
      type: 'string'
    },
    func: {
      type: 'string'
    },
    body: {
      type: 'json'
    },
    controller: {
      type: 'string'
    },
    user: {
      model: 'User'
    }
  }
}

