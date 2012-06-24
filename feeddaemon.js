//script which runs every 5 seconds and pulls in hte main Twitter feed
//@todo set up a list of identities to look up

var http = require('http'),
    util = require('util'),
    url = require('url'), 
    redis = require('redis');

try {
  redis.debug_mode = false;
  var tweet_client = http.createClient(80, 'api.twitter.com');
  var redis_client = redis.createClient(); //make sure that Redis is running
} catch (err) {
	console.log('set up error: '+err);
}

function get_tweets() {

	var request = tweet_client.request("GET", "/1/statuses/public_timeline.json", {"host": "api.twitter.com"}); //must be changed to read the timelines
	redis_client.on("error", function(err) {  console.log('Redis Error: '+ err); });
	request.addListener("response", function (response) {
		var body = "";
		response.addListener("data", function(data) {
			body += data;
		});
		
		response.addListener("end", function() {
			var tweets =JSON.parse(body);
			if (tweets.length > 0) {
				
				for (var a in tweets) {
					console.log("Pushing tweet to the feed: "+tweets[a].user.screen_name);
					redis_client.publish("feeds."+tweets[a].user.screen_name, JSON.stringify(tweets[a].text));
				}

			}
	    });
	});

	//redis_client.quit();
	
	request.end();

} //end get_tweets

setInterval(get_tweets, 5000);

http.createServer(function(req, resp){}).listen(8002);