'use strict'

const actionUtil = require('sails/lib/hooks/blueprints/actionUtil')
const _ = require('lodash')
const R = require('ramda')

class ServiceError extends Error {
  constructor (num, msg, code) {
    super(msg)
    this.serviceError = true
    this.code = code
    this.errNum = num || 500
    this.status = this.errNum
  }
}

let utils = {
  // https://github.com/waterlock/waterlock/blob/master/lib/utils.js#L20
  allParams: function allParams (req) {
    var params = req.params.all()

    // waterlock/waterlock#123
    if (req.isSocket) {
      var socketParams = req.socket.handshake.query
      _.merge(params, socketParams)
    }
    _.merge(params, req.headers)
    return _.merge(params, req.query)
  },

  isProduction: function isProduction () {
    return sails.config.environment === 'production'
  },

  subscribeModelFind: function subscribeModelFind (req, Model, matchingRecords) {
    if (req._sails.hooks.pubsub && req.isSocket) {
      Model.subscribe(req, matchingRecords)
      if (req.options.autoWatch) {
        Model.watch(req)
      }
      // Also subscribe to instances of all associated models
      _.each(matchingRecords, function (record) {
        actionUtil.subscribeDeep(req, record)
      })
    }
  },

  validateValue: function validateValue (value) {
    if (R.isNil(value)) {
      return Promise.reject(new sails.utils.ServiceError(404, 'value not found in db', 'E_VALUE_NOT_FOUND'))
    }
    return Promise.resolve(value)
  },

  // function buildRequest (req) {

  // }

  wrapCtrlReturn: function wrapCtrlReturn (func, defaultCode = 200) {
    return function _wrappedFunction (req, res, next) {
      func(req, res)
      .then(result => {
        return res.json(defaultCode, result)
      })
      .catch(err => {
        if (err instanceof ServiceError || !R.isNil(err.serviceError)) {
          return res.json(err.errNum, {error: err.code})
        }
        return next(err)
      })
    }
  },

  ServiceError,

  // function getParam (req, key) {
  //   let value = req.param(key)
  //   if (!(R.isNil(value) || R.isEmpty()))
  // }

  // https://github.com/waterlock/waterlock/blob/master/lib/cycle.js#L314
  /**
   * returns an ip address and port from the express request object, or the
   * sails.io socket which is attached to the req object.
   *
   * @param  {Object} req express request
   * @return {Object}     the transport address object
   * @api private
   */
  addressFromRequest: function addressFromRequest (req) {
    if (req.connection && req.connection.remoteAddress) {
      var paramIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '0.0.0.0'
      return {
        ip: paramIp,
        port: req.connection.remotePort
      }
    }

    if (req.socket && req.socket.remoteAddress) {
      return {
        ip: req.socket.remoteAddress,
        port: req.socket.remotePort
      }
    }

    return {
      ip: '0.0.0.0',
      port: 'n/a'
    }
  }
}
module.exports = utils
