node-mq
=======

Building a rough queue system with node/redis

A json message is received
queue --> the queue name
msg --> message body

To implement:
transientq --> whether this is transient or not

If transientq is true, then use Redis pub/sub as it has no recovery if a listening client fails unlike MQs. 
Otherwise it will push into a list (to be implemented). 

The client listens to a  defined queue at the other end. The publihser pushes out via JSON and it is up to the 
listener to deal with the messages.

feeddaemon.js is a script which runs every 5 seconds and calls the main Twitter timeline. 
It stores the user name and message in a Redis pub/sub channel. 

The next todo is to call a list of Twitter ids to allow the script to call a defined set or play with search options
e.g.: search for a particular hashtag 