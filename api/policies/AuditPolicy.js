'use strict'
const fnv = require('fnv-plus')
const R = require('ramda')
const url = require('url')

module.exports = function AuditPolicy (req, res, next) {
  if (!sails.config.waterauth.trackRequests) {
    return next()
  }
  // Don't log get methods, we dont care about reading right now
  if (!sails.config.waterauth.trackGetRequests && req.method === 'GET') {
    return next()
  }

  let ipAddress = req.headers['x-forwarded-for'] ||
  (req.connection && req.connection.remoteAddress) ||
  (req.socket && req.socket.handshake.address)

  req.requestId = fnv.hash(new Date().valueOf() + ipAddress, 128).str()

  return sails.models.requestlog.create({
    id: req.requestId,
    ipAddress: ipAddress,
    url: sanitizeRequestUrl(req),
    method: req.method,
    func: req.ctrlProperty,
    body: R.omit(['token', 'password'], req.body),
    controller: req.options.controllerIdentity,
    user: (req.user || {}).id
  })
  .then(() => next())

  .catch(next)

  // persist RequestLog entry in the background continue immediately
  // next()
}

function sanitizeRequestUrl (req) {
  let requestUrl = url.format({
    protocol: req.protocol,
    host: req.host || sails.getHost(),
    pathname: req.originalUrl || req.url,
    query: R.omit(['token', 'password'], req.query)
  })

  return requestUrl

  // return requestUrl.replace(/(password=).*?(&|$)/ig, '$1<hidden>$2')
}
