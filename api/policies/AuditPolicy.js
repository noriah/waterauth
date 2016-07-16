'use strict'
const fnv = require('fnv-plus')
const R = require('ramda')
const url = require('url')

module.exports = function AuditPolicy (req, res, next) {
  let ipAddress = req.headers['x-forwarded-for'] || (req.connection && req.connection.remoteAddress)
  req.requestId = fnv.hash(new Date().valueOf() + ipAddress, 128).str()

  sails.models.requestlog.create({
    id: req.requestId,
    ipAddress: ipAddress,
    url: sanitizeRequestUrl(req),
    method: req.method,
    func: req.ctrlProperty,
    body: R.omit(['password'], req.body),
    controller: req.options.controllerIdentity,
    user: (req.user || {}).id
  })
  .then(R.identity)
  .catch(err => {
    throw err
  })

  // persist RequestLog entry in the background continue immediately
  next()
}

function sanitizeRequestUrl (req) {
  let requestUrl = url.format({
    protocol: req.protocol,
    host: req.host || sails.getHost(),
    pathname: req.originalUrl || req.url,
    query: req.query
  })

  return requestUrl.replace(/(password=).*?(&|$)/ig, '$1<hidden>$2')
}
