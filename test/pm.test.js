var should = require('should'),
  async = require('async'),
  KabamKernel = require('kabam-kernel'),
  request = require('request');


var kabam = KabamKernel({
  'hostUrl':'http://localhost:3011',
  'mongoUrl':'mongodb://localhost/mwc_dev',
  'disableCsrf':true
});

kabam.usePlugin(require('./../index.js'));
kabam.start(3011);


describe('kabam-plugin-private-message',function(){
  var User1,User2;
  before(function(done){
    async.parallel({
      'user1':function(cb){
        kabam.model.User.create({
          'username':'testSpamer1',
          'email':'testSpamer1@example.org',
          'emailVerified':true,
          'profileComplete':true,
          'isBanned':false
        },cb);
      },
      'user2':function(cb){
        kabam.model.User.create({
          'username':'testSpamer2',
          'email':'testSpamer2@example.org',
          'emailVerified':true,
          'profileComplete':true,
          'isBanned':false
        },cb);
      }
    },function(err,obj){
      if(err) throw err;
      User1 = obj.user1;
      User2 = obj.user2;
      done();
    });
  });


  it('sends message');
  it('allows to get messages');

  after(function(done){
    async.parallel([
      function(cb){
        User1.remove(cb);
      },
      function(cb){
        User2.remove(cb);
      },
      function(cb){
        kabam.model.Message.remove({'from':User1._id},cb);
      }
    ],done);
  });
});