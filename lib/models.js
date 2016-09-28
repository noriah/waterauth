'use strict'

const R = require('ramda')
const Promise = require('bluebird')

module.exports = {
  runIndexCheck: function runindexCheck (models) {
    var promises = R.map(modelName => {
      return new Promise((resolve, reject) => {
        let sailsModel = sails.models[modelName]
        if (sailsModel.mongo) {
          let uniqueAttrNames = []
          R.forEach(attrName => {
            if (attrName === 'id') {
              return
            }

            let attr = sailsModel.definition[attrName]
            if (R.is(Object, attr)) {
              if (attr.unique === true) {
                uniqueAttrNames.push(attrName)
              }
            }
          }, R.keys(sailsModel.definition))

          return sailsModel.native((err, collection) => {
            if (err) {
              return reject(err)
            }

            var attrPromises = R.map(attrName => {
              return collection.ensureIndex({[attrName]: 1}, {unique: true})
            }, uniqueAttrNames)

            return Promise.all(attrPromises)
            .then(resolve)
            .catch(reject)
          })
        }
      })
    }, models)

    return Promise.all(promises)
  }
}
