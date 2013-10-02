var sanitaze = require('validator').sanitize;

exports.name = 'kabamPluginPrivateMessage';

exports.routes = function (kabam) {
  kabam.app.get('/api/messages', function (request, response) {
    if (request.user) {
      var mesgLimit = request.query['limit'] ? request.query['limit'] : 10,
        mesgOffset = request.query['offset'] ? request.query['offset'] : 0;

      request.user.getRecentMessages(mesgLimit, mesgOffset, function(err,messages){
        if(err) throw err;
        response.json(messages);
      });
    } else {
      response.send(400);
    }
  });

  kabam.app.get('/api/messages/:username', function (request, response) {
    if (request.user) {
      var mesgLimit = request.query['limit'] ? request.query['limit'] : 10,
        mesgOffset = request.query['offset'] ? request.query['offset'] : 0;

      request.user.getDialog(request.params.username, mesgLimit, mesgOffset, function(err,messages){
        if(err && err.message === 'User do not exists!'){
          response.send(404);
        } else {
          if(err) throw err;
          response.json(messages);
        }
      });
    } else {
      response.send(400);
    }
  });


  kabam.app.post('/api/messages/:username', function (request, response) {
    if (request.user) {
      request.user.sendMessage(request.params.username, request.body.title, request.body.message, function(err){
        if(err) throw err;
        if(request.is('json')){
          response.json(201,{'status':201,'description':'Message is send!'});
        } else {
          response.redirect('back');
        }
      });
    } else {
      response.send(400);
    }
  });
};
