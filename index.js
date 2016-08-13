'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
const Clarifai = require('clarifai')
const token = '{ACCESS_TOKEN}'

app.set('port', (process.env.PORT || 3000))

// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Parse application/json
app.use(bodyParser.json())

// Index routing
app.get('/', function(req, res) {
  res.send('Hello world, I am claire bot')
})

// Facebook verification where verify token is
app.get('/webhook/', function(req, res) {
  if (req.query['hub.verify_token'] === 'claire_bot') {
    res.send(req.query['hub.challenge'])
  }
  else{
    res.send('Error, wrong token')
  }
})

// Listening on port
app.listen(app.get('port'), function() {
  console.log('running on port', app.get('port'))
})

app.post('/webhook/', function(req, res) {
  let messaging_events = req.body.entry[0].messaging
  for (let i = 0; i < messaging_events.length; i++) {
    let event = req.body.entry[0].messaging[i]
    let sender = event.sender.id
    if (event.message && event.message.text) {
      let text = event.message.text
      ValidURL(text, function(isAUrl) {
        if(isAUrl) {
          getTags(text, function(tags) {
            sendTextMessage(sender, tags)
          })
        } else {
          sendTextMessage(sender, 'Please send me an URL of an image')
        }
      })      
    }
  }
  res.sendStatus(200)
})

function sendTextMessage(sender, text) {
  let messageData = { text:text }
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token:token},
    method: 'POST',
    json: {
      recipient: {id:sender},
      message: messageData,
    }
  }, function(error, response, body) {
    if (error) {
      console.log('Error sending messages: ', error)
    } else if (response.body.error) {
      console.log('Error: ', response.body.error)
    }
  })
}

function getTags(url, callback) {
  Clarifai.initialize({
    'clientId': '{CLIENT_ID}',
    'clientSecret': '{CLIENT_SECRET}'
  });
  Clarifai.getTagsByUrl(url).then(
    function(response) {
      let tags = response.results[0].result.tag.classes.toString()
      callback(tags)
    },
    function(error) {
      console.log(error)
    }
  );
}

function ValidURL(str, callback) {
  let pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|'+ // domain name
  '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
  '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
  '(\\#[-a-z\\d_]*)?$','i'); // fragment locater
  if(!pattern.test(str)) {
    callback(false);
  } else {
    callback(true);
  }
}
