'use strict'
const R = require('ramda')

module.exports = {
  /**
   * @param req
   */
  buildCallbackNextUrl: function buildCallbackNextUrl (req) {
    let url = req.query.next
    let includeToken = req.query.includeToken
    let accessToken = R.path(req, R.split('.', 'session.tokens.accessToken'))

    if (includeToken && accessToken) {
      return url + '?access_token=' + accessToken
    } else {
      return url
    }
  }
}
