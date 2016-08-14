var request = require('supertest')

describe('Role Controller', function () {

  describe('', function() {
    it('should redirect to /mypage', function (done) {
      request(sails.hooks.http.app)
        .post('/user/')
        .send({ name: 'test', password: 'test' })
        .expect(200)
        .expect('location','/mypage', done)
    });
  });

});
