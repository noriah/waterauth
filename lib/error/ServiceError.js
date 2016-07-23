'use strict'

class ServiceError extends Error {
  constructor (num, msg, code) {
    super(msg)
    this.serviceError = true
    this.code = code
    this.errNum = num || 500
  }
}

module.exports = ServiceError
