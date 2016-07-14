'use strict'

module.exports = function BearerAuthPolicy (req, res, next) {
  if (req.options) {
    if (req.options.controller && req.options.action) {
      req.calledAction = req.options.controller + '.' + req.options.action
    }
  }
  next()
}
