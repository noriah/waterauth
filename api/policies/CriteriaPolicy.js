'use strict'
/**
 * CriteriaPolicy
 * @depends PermissionPolicy
 *
 * Verify that the User fulfills permission 'where' conditions and attribute blacklist restrictions
 */
const wlFilter = require('waterline-criteria')
const _ = require('lodash')
const R = require('ramda')

var PermissionService

sails.after('hook:orm:loaded', () => {
  ({
    services: {
      permissionservice: PermissionService
    }
  } = sails)
})

module.exports = function CriteriaPolicy (req, res, next) {
  let permissions = req.permissions

  if (R.isEmpty(permissions)) {
    return next()
  }

  let httpMethod = PermissionService.getMethod(req.method)

  let body = req.body || req.query

  // if we are creating, we don't need to query the db, just check the where clause vs the passed in data
  if (httpMethod === 'create') {
    if (!PermissionService.hasPassingCriteria(body, permissions, body)) {
      return res.send(403, {
        error: 'Can\'t create this object, because of failing where clause'
      })
    }
    return next()
  }

  // set up response filters if we are not mutating an existing object
  if (!R.contains(httpMethod, ['update', 'delete'])) {
    // get all of the where clauses and blacklists into one flat array
    // if a permission has no criteria then it is always true
    let criteria = _.compact(R.flatten(
      R.map(c => {
        if (c.length === 0) {
          return [{where: {}}]
        }
        return c
      }, R.pluck('criteria', permissions))
    ))

    if (criteria.length) {
      // langateam/sails-permission#165
      if (req.options.alias) {
        PermissionService.findTargetObjects(req).then(data => {
          if (filterObjectsByCriteria(R.is(Array, data) ? data : [data], criteria).length === 0) {
            return res.notFound()
          }
          next()
        })
        .catch(next)
        return
      } else {
        bindResponsePolicy(req, res, criteria)
      }
      // bindResponsePolicy(req, res, criteria)
    }
    return next()
  }

  PermissionService.findTargetObjects(req)
    .then(objects => {
      // attributes are not important for a delete request
      if (httpMethod === 'delete') {
        body = undefined
      }

      if (!PermissionService.hasPassingCriteria(objects, permissions, body, req.user.id)) {
        return res.send(403, {
          error: 'Can\'t ' + httpMethod + ', because of failing where clause or attribute permissions'
        })
      }

      next()
    })
    .catch(next)
}

function filterObjectsByCriteria (objects, criteria) {
  return objects.reduce((memo, item) => {
    criteria.some(crit => {
      let filtered = wlFilter([item], {
        where: {
          or: [crit.where || {}]
        }
      }).results

      if (filtered.length) {
        if (crit.blacklist && crit.blacklist.length) {
          crit.blacklist.forEach(term => {
            delete item[term]
          })
        }
        memo.push(item)
        return true
      }
    })
    return memo
  }, [])
}

function bindResponsePolicy (req, res, criteria) {
  res._ok = res.ok

  res.ok = _.bind(responsePolicy, {
    req: req,
    res: res
  }, criteria)
}

function responsePolicy (criteria, _data, options) {
  let req = this.req
  let res = this.res
  // var user = req.owner
  // var method = PermissionService.getMethod(req)
  let isResponseArray = R.is(Array, _data)

  let data = isResponseArray ? _data : [_data]

  // remove undefined, since that is invalid input for waterline-criteria
  data = data.filter(item => { return item !== undefined })

  // langateam/sails-permission#165
  let permitted = filterObjectsByCriteria(data, criteria)
  // var permitted = data.reduce(function (memo, item) {
  //   criteria.some(function (crit) {
  //     var filtered = wlFilter([item], {
  //       where: {
  //         or: [crit.where || {}]
  //       }
  //     }).results

  //     if (filtered.length) {
  //       if (crit.blacklist && crit.blacklist.length) {
  //         crit.blacklist.forEach(function (term) {
  //           delete item[term]
  //         })
  //       }
  //       memo.push(item)
  //       return true
  //     }
  //   })
  //   return memo
  // }, [])

  if (isResponseArray) {
    return res._ok(permitted, options)
  } else if (permitted.length === 0) {
    sails.log.silly('permitted.length === 0')
    return res.send(404)
  } else {
    res._ok(permitted[0], options)
  }
}
