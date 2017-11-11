'use strict';
const PAGE_ACCESS_TOKEN =
    'EAACTY2uvuOkBACccJs0PNA8i9UecT6D9XrhLLZAiuyN4k23AMtbwSP7FRRm8inSjEuaDD7myfDFDmtS8ZALNZAOmJTD7OFEoSCiAVIKJrbz7nusdaBFRNjl8BKMTrL3bNevr55Ijx5Nkax3G7Tsb3PU2Frqq7YCgWUKv66HjwZDZD';
const APIAI_TOKEN = '8efcfc62d41a455a988392716ec4b846';
const WEATHER_API_KEY = '098696f24429f40a428d56fde3d4a6e7';

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const apiai = require('apiai');
const moment = require('moment-timezone');
const Shopify = require('shopify-api-node');


const SHOPIFY_SHOP_NAME = (process.env.SHOP_NAME) ? 
process.env.SHOP_NAME :
config.get('sh_shopName');  

const SHOPIFY_API_KEY = (process.env.SHOP_API_KEY) ? 
process.env.SHOP_API_KEY :
config.get('sh_apiKey');  

const SHOPIFY_API_PASSWORD = (process.env.SHOP_API_PASSWORD) ? 
process.env.SHOP_API_PASSWORD :
config.get('sh_apiPassword');  

const HOST_URL = (process.env.HOST_URL) ? 
process.env.HOST_URL :
config.get('host_url'); 

const shopify = new Shopify({
    shopName: SHOPIFY_SHOP_NAME,
    apiKey: SHOPIFY_API_KEY,
    password: SHOPIFY_API_PASSWORD
  });
 

const app = express();
app.set('port', (process.env.PORT || 5000));
let currentTime = moment();
let estTimeStamp = moment.tz(currentTime, 'America/Toronto').format();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

const server = app.listen(process.env.PORT || 5000, () => {
  console.log(
      'Express server listening on port %d in %s mode', server.address().port,
      app.settings.env + '-' + estTimeStamp);
});

const apiaiApp = apiai(APIAI_TOKEN);

app.get('/', (req, res) => {

  console.log('Time Stamp :' + estTimeStamp);
  res.send('Home Page');
});
/* For Facebook Validation */
app.get('/webhook', (req, res) => {
  console.log('get webhook query --> \n' + req.query);
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === 'tuxedo_cat') {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});

/* Handling all messenges */
app.post('/webhook', (req, res) => {

  console.log('\n\nTime Stamp :' + estTimeStamp + '\n');
  console.log('post method  webhook--> \n' + req.body.object);
  if (req.body.object === 'page') {
    req.body.entry.forEach((entry) => {
      entry.messaging.forEach((event) => {
        if (event.message && event.message.text) {
          console.log(
              '\n\nreceive event Time Stamp :' + estTimeStamp + '\t' + event +
              '\n');
          receivedMessage(event);
        }
      });
    });
    res.status(200).end();
  }
});

/* GET query from API.ai */

function receivedMessage(event) {
  let sender = event.sender.id;
  let text = event.message.text;

  let apiaiSession = apiaiApp.textRequest(text, {sessionId: 'tabby_cat'});

  apiaiSession.on('response', (response) => {
    let aiText = response.result.fulfillment.speech;
    console.log('\n\napiai.on Time Stamp :' + estTimeStamp + '\n');
    console.log('aiText-->' + aiText);

    switch (aiText) {
      case 'SHOW_BIOGRAPHY':
        console.log(
            '\n\nswitch to prepareSendBio Time Stamp :' + estTimeStamp + '\n');
        prepareSendBio(sender);
        break;

      default:
        console.log(
            '\n\nswitch to prepareSendAiMessage Time Stamp :' + estTimeStamp +
            '\n');
        prepareSendAiMessage(sender, aiText);
    }

  });

  apiaiSession.on('error', (error) => {
    console.log(error);
  });

  apiaiSession.end();
  }

function sendMessage(messageData) {
  request(
      {
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: messageData
      },
      (error, response) => {
        if (error) {
          console.log('Error sending message: ', error);
        } else if (response.body.error) {
          console.log('Error: ', response.body.error);
        }
      });
  }

function prepareSendAiMessage(sender, aiText) {
  let messageData = {recipient: {id: sender}, message: {text: aiText}};
  console.log(
      '\n\n in prepareSendAiMessage Time Stamp :' + estTimeStamp + '\n');
  console.log('messageData-->' + JSON.stringify(messageData));

  sendMessage(messageData);
}


/* Webhook for API.ai to get response from the 3rd party API */
app.post('/ai', (req, res) => {
  console.log('\n\napp.post API AI Time Stamp :' + estTimeStamp + '\n');
  console.log('*** Webhook for api.ai query ***');
  console.log(req.body.result.action);

  if (req.body.result.action === 'weather') {
    console.log('\n\n*** weather *** Time Stamp :' + estTimeStamp + '\n');
    let city = req.body.result.parameters['geo-city'];
    let openWeatherMapUrl =
        'http://api.openweathermap.org/data/2.5/weather?APPID=' +
        WEATHER_API_KEY + '&q=' + city;

    request.get(openWeatherMapUrl, (err, response, body) => {
      if (!err && response.statusCode == 200) {
        let json = JSON.parse(body);
        console.log('openweathermap response --> \n' + JSON.stringify(json));
        let tempF = ~~(json.main.temp * 9 / 5 - 459.67);
        let tempC = ~~(json.main.temp - 273.15);
        let msg = 'The current condition in ' + json.name + ' is ' +
            json.weather[0].description + ' and the temperature is ' + tempF +
            ' ℉ (' + tempC + ' ℃).';
        return res.json({speech: msg, displayText: msg, source: 'weather'});
      } else {
        let errorMessage = 'I failed to look up the city name.';
        return res.status(400).json(
            {status: {code: 400, errorType: errorMessage}});
      }
    });
    }

  if (req.body.result.action === 'currency') {
    console.log('\n\n*** Currency *** Time Stamp :' + estTimeStamp + '\n');
    let fromCurrency = req.body.result.parameters['from-currency'];
    let toCurrency = req.body.result.parameters['to-currency'];
    // let unitCurrency = req.body.result.parameters.unit-currency['amount'];
    let fixerCurrencyUrl = 'https://api.fixer.io/latest?base=' + fromCurrency +
        '&symbols=' + toCurrency;
        
        request.get(fixerCurrencyUrl, (err, response, body) => {
          if (!err && response.statusCode == 200) {
            let currecnyJson = JSON.parse(body);
            console.log('\nfixerCurrencyUrl response --> \n' + JSON.stringify(currecnyJson));
            let conversionRates = currecnyJson.rates[toCurrency];
            console.log('\n conversionRates --> ' + JSON.stringify(conversionRates));
            
            let msg = 'The current currency conversion rate from ' + currecnyJson.base + ' to ' +
            toCurrency+ ' : '+ conversionRates  ;
            return res.json({speech: msg, displayText: msg, source: 'currency'});
          } else {
            let errorMessage = 'I failed to look up the currency.';
            return res.status(400).json(
                {status: {code: 400, errorType: errorMessage}});
          }
        });
  }
  if (req.body.result.action === 'shipping') {
    console.log('\n\n*** Shipping *** Time Stamp :' + estTimeStamp + '\n');
    let address = req.body.result.parameters['address'];
    // let unitCurrency = req.body.result.parameters.unit-currency['amount'];
    let shippingUrl = 'https://api.fixer.io/latest?base=' + fromCurrency +
        '&symbols=' + toCurrency;
        
        request.get(fixerCurrencyUrl, (err, response, body) => {
          if (!err && response.statusCode == 200) {
            let currecnyJson = JSON.parse(body);
            console.log('\nfixerCurrencyUrl response --> \n' + JSON.stringify(currecnyJson));
            let conversionRates = currecnyJson.rates[toCurrency];
            console.log('\n conversionRates --> ' + JSON.stringify(conversionRates));
            
            let msg = 'The current currency conversion rate from ' + currecnyJson.base + ' to ' +
            toCurrency+ ' : '+ conversionRates  ;
            return res.json({speech: msg, displayText: msg, source: 'currency'});
          } else {
            let errorMessage = 'I failed to look up the currency.';
            return res.status(400).json(
                {status: {code: 400, errorType: errorMessage}});
          }
        });
  }



});
