/**
 * Test starter - with this version of sails.js we can only start one sails server,
 * to solve this problem we use only one before All and after All to start and
 * stop the server
 */
describe('UserModel', function () {

  describe('#find()', function () {
    it('should check find function', function (done) {
      User.find()
      .then(function (results) {
        // some tests
        done()
      })
      .catch(done)
    })
  })

})
