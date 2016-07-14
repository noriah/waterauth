'use strict'
var R = require('ramda')

module.exports = {

  /**
   * @param req
   */
  buildCallbackNextUrl: function buildCallbackNextUrl (req) {
    var url = req.query.next
    var includeToken = req.query.includeToken
    var accessToken = R.pathGet(req, 'session.tokens.accessToken')

    if (includeToken && accessToken) {
      return url + '?access_token=' + accessToken
    } else {
      return url
    }
  }
}
