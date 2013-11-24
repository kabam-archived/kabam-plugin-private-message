var should = require('should'),
  async = require('async'),
  kabamKernel = require('kabam-kernel'),
  request = require('request'),
  port = 3019;

describe('kabam-plugin-private-message', function () {
  var kernel;
  before(function (done) {
    this.timeout(3000);

    kernel = kabamKernel({
      'HOST_URL': 'http://localhost:'+port,
      'MONGO_URL': 'mongodb://localhost/kabam_test',
      'DISABLE_CSRF': true // NEVER DO IT!
    });

    kernel.on('started', function () {
      kernel.mongoConnection.on('open', function(){
        kernel.mongoConnection.db.dropDatabase(function () {
          done();
        });
      });
    });

    kernel.usePlugin(require('./../index.js'));
    kernel.start(port);
  });

  describe('it works', function () {
    var user1, user2, world;
    before(function (done) {
      async.waterfall([
        function (cb) {
          kernel.model.User.create({
            'username': 'testSpamer1',
            'email': 'testSpamer1@example.org',
            'emailVerified': true,
            'profileComplete': true,
            'isBanned': false
          }, cb);
        },
        function (user, cb) {
          user1 = user;
          kernel.model.User.create({
            'username': 'testSpamer2',
            'email': 'testSpamer2@example.org',
            'emailVerified': true,
            'profileComplete': true,
            'isBanned': false
          }, cb);
        },
        function (user, cb) {
          user2 = user;
          world = new kernel.model.World({
            name: 'world',
            description: 'world group',
            ownerId: user1._id
          });
          world.save(cb);
        },
        function(group, owner, cb) {
          world = group;
          user1 = owner;
          world.addMember(user2._id, 'member', cb);
        }
      ], function (err, user) {
        if (err) {
          throw err;
        }
        user2 = user;
        done();
      });
    });

    describe('User1 sends message to user2 by post request', function () {
      var response, body, event;

      before(function (done) {

        kernel.once('notify:pm', function (m) {
          event = m;
          setTimeout(done, 500);
        });

        request({
            'url': 'http://localhost:'+port+'/api/messages/testSpamer2',
            'method': 'POST',
            'json': {
              'kabamkey': user1.apiKey, //authorize as User1
              'title':'test1title',
              'message': 'test1'
            }
        }, function (err, r, b) {
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
        event.from._id.should.be.eql(user1._id);
      });
      it('event have correct "user" field', function () {
        event.user._id.should.be.eql(user2._id);
      });
      it('event have proper contents', function () {
        event.message.should.be.equal('test1');
      });
    });

    describe('user2 receives his recent messages', function () {
      var response, body;
      before(function (done) {
        request({
            'url': 'http://localhost:'+port+'/api/messages?kabamkey=' + user2.apiKey,
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

        messages[0].to.should.be.eql(user2._id.toString());
        messages[0].toProfile.username.should.be.eql(user2.username);
        //messages[0].toProfile.gravatar.should.be.eql(user2.gravatar);
        messages[0].toProfile.isBanned.should.be.eql(user2.isBanned);

        messages[0].from.should.be.eql(user1._id.toString());
        messages[0].from.should.be.eql(user1._id.toString());
        messages[0].fromProfile.username.should.be.eql(user1.username);
        //messages[0].fromProfile.gravatar.should.be.eql(user1.gravatar);
        messages[0].fromProfile.isBanned.should.be.eql(user1.isBanned);

        messages[0].message.should.be.equal('test1');
        messages[0].title.should.be.equal('test1title');

      });

    });

    describe('user2 receives dialog with user1', function () {
      var response, body;
      before(function (done) {
        request({
            'url': 'http://localhost:'+port+'/api/messages/' + user1.username + '?kabamkey=' + user2.apiKey,
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


        messages[0].to.should.be.eql(user2._id.toString());
        messages[0].toProfile.username.should.be.eql(user2.username);
        //messages[0].toProfile.gravatar.should.be.eql(user2.gravatar);
        messages[0].toProfile.isBanned.should.be.eql(user2.isBanned);

        messages[0].from.should.be.eql(user1._id.toString());
        messages[0].fromProfile.username.should.be.eql(user1.username);
        //messages[0].fromProfile.gravatar.should.be.eql(user1.gravatar);
        messages[0].fromProfile.isBanned.should.be.eql(user1.isBanned);
        messages[0].title.should.be.equal('test1title');
        messages[0].message.should.be.equal('test1');
        //messages.should.be.equal(1);

      });

    });

    after(function (done) {
      async.parallel([
        function (cb) {
          user1.remove(cb);
        },
        function (cb) {
          user2.remove(cb);
        },
        function (cb) {
          kernel.model.Message.remove({'from': user1._id}, cb);
        }
      ], done);
    });

  });

  after(function (done) {
    kernel.stop();
    done();
  });
});
