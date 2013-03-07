var http = require('http'), 
util = require('util'), 
url = require('url'), 
redis = require('redis'), 
qs = require("querystring");
    
try {
	redis.debug_mode = false;
    var redis_client = redis.createClient(); 
    var redis_produce = redis.createClient(); 
} catch (err) {
	console.log('set up error: '+err);
}

var urlMap = {
  '/consumer' : function (req, res) {
	  var qtype = json.prefix.split("/");
	  if (qtype[0] == "notify") {
		  notify.consume(json, function (data) {
			  res.simpleJSON(200, data);
		  }); 
	  } else {
	      queue.consume(json, function (data) {
		      res.simpleJSON(200, data);
	      });
	  }
	},
	'/producer' : function (req, res, json) {
	   //if transient - send to notify
		var qtype = json.prefix.split("/");
		if (qtype[0] == "notify") {
			notify.produce(json);
		} else {
			queue.produce(json);
		}
	    res.simpleJSON(200, {});
	}
}

/**
 * Function to send a notification out via Pub/Sub. 
 */
var notify = new function () {
	var callbacks=[];
	this.consume = function (json, callback) {
       var b = [];
		redis_client.on("error", function(err) {  console.log('Redis Error: '+ err); });
	    
	    redis_client.on("psubscribe", function (pattern, count) {
	        console.log(" psubscribed to " + pattern + ", " + count + " total subscriptions");
	    });
	    redis_client.on("punsubscribe", function (pattern, count) {
	        console.log(new Date() + " [FATAL] " + pattern + ", " + count + " total subscriptions");
	    });	    
	    redis_client.on("pmessage", function(pattern, channel, message) {
		  b.push({ timestamp: new Date(), msg: message });
		  callback({ timestamp: new Date(), msg: message });
	    });
	    
	    if (b.length != 0) {
			callback(b);
			} else {
			callbacks.push({ timestamp: new Date(), callback: callback });
			};
			console.log(callbacks);

	    redis_client.psubscribe(json.queue);
	    
    } //end consume
	
	//function to produce the message
	this.produce = function(json) {
		  redis_produce.publish(json.queue, json.msg);
		
	} //end produce
} //end notification

/**
 * Function to send a message to a queue via a list
 */
var queue = new function () {
	var callbacks=[];
	this.consume = function (json, callback) {
        var b = [];
	    redis_client.on("error", function(err) {  console.log('Redis Error: '+ err); });
	    
	    if (b.length != 0) {
			callback(b);
		} else {
			callbacks.push({ timestamp: new Date(), callback: callback });
		};
		console.log(callbacks);
	    redis_client.blpop(json.queue);
    }; //end consume
	//function to push the message into the queue
	this.produce = function(json) {
		redis_produce.rpush(json.queue, json.msg);
	}; //end produce
}; //end queue


http.createServer(function(req, res){
	handler = urlMap[url.parse(req.url).pathname];
	if (req.method=='POST') { ///POST should produce
		req.body = '';

		req.addListener('data', function (chunk) {
		// Build the body from the chunks sent in the post.
		req.body = req.body + chunk;
		})
		.addListener('end', function () {
		  json = JSON.parse(req.body);
		  handler(req, res, json);	
		});
	} else  { //change this so that a GET consumes only?
		handler(req, res);
		console.log("fell over");
	}
	
	res.simpleJSON = function (code, obj) {
		var body = JSON.stringify(obj);
		res.writeHead(code, {
			"Content-Type": "text/json",
			"Content-Length": body.length
		});
		res.end(body);
	};
}).listen(8003);