var should = require('should'),
  async = require('async'),
  KabamKernel = require('kabam-kernel'),
  request = require('request'),
  port = 3019;

describe('kabam-plugin-private-message', function () {
  var kabam;
  before(function (done) {

    kabam = KabamKernel({
      'hostUrl': 'http://localhost:'+port,
      'mongoUrl': 'mongodb://localhost/mwc_dev',
      'disableCsrf': true // NEVER DO IT!
    });

    kabam.on('started', function (evnt) {
      done();
    });
    kabam.usePlugin(require('./../index.js'));
    kabam.start(port);

  });


  describe('it works', function () {
    var User1, User2;
    before(function (done) {
      async.parallel({
        'user1': function (cb) {
          kabam.model.User.create({
            'username': 'testSpamer1',
            'email': 'testSpamer1@example.org',
            'emailVerified': true,
            'profileComplete': true,
            'isBanned': false
          }, cb);
        },
        'user2': function (cb) {
          kabam.model.User.create({
            'username': 'testSpamer2',
            'email': 'testSpamer2@example.org',
            'emailVerified': true,
            'profileComplete': true,
            'isBanned': false
          }, cb);
        }
      }, function (err, obj) {
        if (err) {
          throw err;
        }
        User1 = obj.user1;
        User2 = obj.user2;
        done();
      });
    });

    describe('User1 sends message to User2 by post request', function () {
      var response, body, event;
      before(function (done) {
        kabam.once('notify:pm', function (m) {
          event = m;
          setTimeout(done, 1000);
        });

        request({
            'url': 'http://localhost:'+port+'/api/messages/testSpamer2',
            'method': 'POST',
            'json': {
              'mwckey': User1.apiKey, //authorize as User1
              'message': 'test1'
            }
          },
          function (err, r, b) {
            if (err) {
              throw err;
            }
            response = r;
            body = b;
          });
      });

      it('he receives proper response for it', function () {
        response.statusCode.should.be.equal(201);
        body.should.be.eql({'status': 201, 'description': 'Message is send!'});
      });

      it('event is emitted once when user sends message', function () {
        should.exist(event);
      });
      it('event have correct "from" field', function () {
        event.from._id.should.be.eql(User1._id);
      });
      it('event have correct "user" field', function () {
        event.user._id.should.be.eql(User2._id);
      });
      it('event have proper contents', function () {
        event.message.should.be.equal('test1');
      });
    });

    describe('User2 recieves his recent messages', function () {
      var response, body;
      before(function (done) {
        request({
            'url': 'http://localhost:'+port+'/api/messages?mwckey=' + User2.apiKey,
            'method': 'GET'
          },
          function (err, r, b) {
            if (err) {
              throw err;
            }
            response = r;
            body = b;
            done();
          });
      });

      it('he receives proper response for it', function () {
        response.statusCode.should.be.equal(200);
        var messages = JSON.parse(body);
        messages.should.be.instanceOf(Array);
        messages.length.should.be.equal(1);

        messages[0].to.should.be.eql(User2._id.toString());
        messages[0].from.should.be.eql(User1._id.toString());
        messages[0].message.should.be.equal('test1');

      });

    });

    describe('User2 recieves dialog with User1', function () {
      var response, body;
      before(function (done) {
        request({
            'url': 'http://localhost:'+port+'/api/messages/' + User1.username + '?mwckey=' + User2.apiKey,
            'method': 'GET'
          },
          function (err, r, b) {
            if (err) {
              throw err;
            }
            response = r;
            body = b;
            done();
          });
      });

      it('he receives proper response for it', function () {
        response.statusCode.should.be.equal(200);
        var messages = JSON.parse(body);
        messages.should.be.instanceOf(Array);
        messages.length.should.be.equal(1);


        messages[0].to.should.be.eql(User2._id.toString());
        messages[0].toProfile.username.should.be.eql(User2.username);
//        messages[0].toProfile.gravatar.should.be.eql(User2.gravatar);
        messages[0].toProfile.isBanned.should.be.eql(User2.isBanned);

        messages[0].from.should.be.eql(User1._id.toString());
        messages[0].fromProfile.username.should.be.eql(User1.username);
//        messages[0].fromProfile.gravatar.should.be.eql(User1.gravatar);
        messages[0].fromProfile.isBanned.should.be.eql(User1.isBanned);

        messages[0].message.should.be.equal('test1');
//	messages.should.be.equal(1);

      });

    });

    after(function (done) {
      async.parallel([
        function (cb) {
          User1.remove(cb);
        },
        function (cb) {
          User2.remove(cb);
        },
        function (cb) {
          kabam.model.Message.remove({'from': User1._id}, cb);
        }
      ], done);
    });

  });

  after(function (done) {
    kabam.stop();
    done();
  });
});
