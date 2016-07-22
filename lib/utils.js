'use strict'

const actionUtil = require('sails/lib/hooks/blueprints/actionUtil')
const _ = require('lodash')
// const R = require('ramda')

// https://github.com/waterlock/waterlock/blob/master/lib/utils.js#L20
function allParams (req) {
  var params = req.params.all()

  // waterlock/waterlock#123
  if (req.isSocket) {
    var socketParams = req.socket.handshake.query
    _.merge(params, socketParams)
  }
  _.merge(params, req.headers)
  return _.merge(params, req.query)
}

function isProduction () {
  return sails.config.environment === 'production'
}

function subscribeModelFind (req, Model, matchingRecords) {
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
}

function buildRequest (req) {

}

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
function addressFromRequest (req) {
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

module.exports = {
  allParams,
  addressFromRequest,
  subscribeModelFind,
  isProduction
}
