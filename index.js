"use strict";
const PAGE_ACCESS_TOKEN =
  "EAACTY2uvuOkBAFBcPFvJriCcPDyyTNgBXQLsSLU08e9ZAYQf5uRBogoUVPzpI2KZB8C4krfvu541IPGMihLjIr7klOGnoFHHWDuYSPZChKnIAgQAIZC4JCfUxAZBNcqhn8psy1BihTKMHgPcPqVPAZCZBcKRFANC50MrdPZCUdcEvQZDZD";
const APIAI_TOKEN = "9093b127fa0f4769ae2b4453b794c5cf";
const WEATHER_API_KEY = "098696f24429f40a428d56fde3d4a6e7";
const FB_VALIDATION_TOKEN = "Team19";
const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const apiai = require("apiai");
const moment = require("moment-timezone");
const Shopify = require("shopify-api-node");
const clarifai = require('clarifai');

const clarifaiapp = new clarifai.App({
  apiKey: 'b8776e47515c4c16a5ca8f6dff722b0e'
 });
const SHOPIFY_SHOP_NAME = "dev-circle-toronto-hackathon";

const SHOPIFY_API_KEY = "dc032c19e4460b1e9df1b31b86417fae";

const SHOPIFY_API_PASSWORD = "52db31500c4d546381f9aedacbe707bc";

const HOST_URL =
  "https://dc032c19e4460b1e9df1b31b86417fae:52db31500c4d546381f9aedacbe707bc@dev-circle-toronto-hackathon.myshopify.com/";

const shopify = new Shopify({
  shopName: SHOPIFY_SHOP_NAME,
  apiKey: SHOPIFY_API_KEY,
  password: SHOPIFY_API_PASSWORD
});

const app = express();
app.set("port", process.env.PORT || 5000);
let currentTime = moment();
let estTimeStamp = moment.tz(currentTime, "America/Toronto").format();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = app.listen(process.env.PORT || 5000, () => {
  console.log(
    "Express server listening on port %d in %s mode",
    server.address().port,
    app.settings.env + "-" + estTimeStamp
  );
});

const apiaiApp = apiai(APIAI_TOKEN);

app.get("/", (req, res) => {
  console.log("Time Stamp :" + estTimeStamp);
  res.send("Home Page");
});
/* For Facebook Validation */
app.get("/webhook", function(req, res) {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === FB_VALIDATION_TOKEN
  ) {
    console.log("[app.get] Validating webhook");
    res.status(200).send(req.query["hub.challenge"]);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});

app.post("/webhook", function(req, res) {
  // You must send back a status 200 to let the Messenger Platform know that you've
  // received the callback. Do that right away because the countdown doesn't stop when
  // you're paused on a breakpoint! Otherwise, the request might time out.
  res.sendStatus(200);

  var data = req.body;

  // Make sure this is a page subscription
  if (data.object == "page") {
    // entries may be batched so iterate over each one
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        let propertyNames = [];
        for (var prop in messagingEvent) {
          propertyNames.push(prop);
        }
        console.log(
          "[app.post] Webhook received a messagingEvent with properties:\n ",
          +propertyNames.join()
        );

        if (messagingEvent.message) {
          // someone sent a message
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          // messenger platform sent a delivery confirmation
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          // user replied by tapping one of our postback buttons
          receivedPostback(messagingEvent);
        } else {
          console.log(
            "[app.post] Webhook is not prepared to handle this message."
          );
        }
      });
    });
  }
});

/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message. 
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 * 
 */
function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  var payload = event.postback.payload;

  console.log(
    "[receivedPostback] from user (%d) on page (%d) with payload ('%s') " +
      "at (%d)",
    senderID,
    recipientID,
    payload,
    timeOfPostback
  );

  sendButtonMessages(senderID, payload);
}

function receivedDeliveryConfirmation(event) {
  var senderID = event.sender.id; // the user who sent the message
  var recipientID = event.recipient.id; // the page they sent it from
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;

  if (messageIDs) {
    messageIDs.forEach(function(messageID) {
      console.log(
        "[receivedDeliveryConfirmation] Message with ID %s was delivered",
        messageID
      );
    });
  }
  console.log(
    "[receivedDeliveryConfirmation] All messages before timestamp %d were delivered.",
    watermark
  );
}


/*call to calrifi api */

function sendToClarify(fbImgURL){

  clarifaiapp.models.predict('e0be3b9d6a454f0493ac3a30784001ff', fbImgURL).then(
    function(response) {
      
      console.log("Clarify response - \n "+response);
    },
    function(err) {
      console.error(err);
    }
  );
}


/* Received message from FB-> send it to api.ai to get action -> GET query from API.ai for the text */

function receivedMessage(event) {
  console.log(JSON.stringify(event));
  let sender = event.sender.id;
  let text = event.message.text;
  let receivedMessage = event.message;

  if (receivedMessage.attachments && receivedMessage.attachments[0].payload.url) {
    let attachedImgURL = receivedMessage.attachments[0].payload.url;
    console.log("Received image message : %s" + attachedImgURL);

  sendToClarify(attachedImgURL);
  } else {
    let apiaiSession = apiaiApp.textRequest(text, { sessionId: "tabby_cat" });

    apiaiSession.on("response", response => {
      console.log(JSON.stringify(response));
      let aiTextAction = response.result.action;
      let aiTextResponse = response.result.fulfillment.speech;

      console.log(
        "\n****************************processing event****************************\n"
      );
      console.log("aiTextAction-->" + aiTextAction);

      switch (aiTextAction) {
        case "SHOW_BIOGRAPHY":
          console.log(
            "\n\nswitch to prepareSendBio Time Stamp :" + estTimeStamp + "\n"
          );
          prepareSendBio(sender);
          break;
        case "search":
          if (
            response.result.parameters["userSearchText"] ||
            response.result.parameters["recommandType"]
          ) {
            //&limit=1
            let searchText = response.result.parameters["userSearchText"]
              ? response.result.parameters["userSearchText"]
              : "Leggings tank yoga 50-75 Apparel active";
            console.log("searchText->" + searchText);

            let searchShopifyURL =
              HOST_URL +
              "admin/products.json?title=" +
              searchText +
              "&limit=10";
          
            console.log(searchShopifyURL);
            request.get(searchShopifyURL, (err, response, body) => {
              if (!err && response.statusCode == 200) {
                let product_json = JSON.parse(body);
                console.log("shopify result-->" + product_json.products.length);

                if (product_json.products.length < 1) {
                  let errorMessage =
                    "I failed to look up the your search item in our store.do you want to search something else?";
                  prepareSendTextMessage(sender, errorMessage);
                } else {
                  sendProductsOptionsAsButtonTemplates(
                    sender,
                    product_json.products,
                    searchText
                  );
                  // sendButtonMessages(sender, requestForHelpOnFeature);
                }
              } else {
                let errorMessage = "I failed to look up the your search.";
                prepareSendTextMessage(sender, errorMessage);
              }
            });
          } else {
            let errorMessage = "please narrow down your search.";
            prepareSendTextMessage(sender, errorMessage);

            //ask users something to search
          }

          break;

        default:
          console.log(
            "\n\nswitch to prepareSendTextMessage Time Stamp :" +
              estTimeStamp +
              "\n"
          );
          prepareSendTextMessage(sender, aiTextResponse);
      }
    });

    apiaiSession.on("error", error => {
      console.log(error);
    });

    apiaiSession.end();
  }
}

function sendProductsOptionsAsButtonTemplates(recipientId, products,searchTag) {
  console.log(
    "[sendHelpOptionsAsButtonTemplates] Sending the help options menu"
  );
  
  // var products = shopify.product.list({ limit: requestPayload.limit });
  // products.then(function(listOfProducs) {
  var sectionButton = function(title, action, options) {
    var payload = options | {};
    payload = Object.assign(options, { action: action });
    return {
      type: "postback",
      title: title,
      payload: JSON.stringify(payload)
    };
  };
  var templateElements = [];
  products.forEach(function(product) {
    var url = HOST_URL + "products/" + product.handle;
    // console.log("Product url -\n" + url);
    
    templateElements.push({
      title: product.title,
      subtitle: product.tags,
      image_url: product.image.src,
      buttons: [
        {
          type: "web_url",
          url: url,
          title: "Read description",
          // webview_height_ratio: "compact",
          // messenger_extensions: "true"
        },
        sectionButton("Check avaliable Sizes and colors", "QR_GET_PRODUCT_OPTIONS", {
          id: product.id
        }),
        sectionButton("Check Price", "QR_GET_PRODUCT_PRICE", {
          id: product.id
        })
      ]
    });
  });
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: templateElements
        }
      }
    }
  };

  sendMessagetoFB(messageData);
  // });
}


function sendButtonMessages(recipientId, requestForHelpOnFeature) {
  var templateElements = [];
  var requestPayload = JSON.parse(requestForHelpOnFeature);
  var sectionButton = function(title, action, options) {
    var payload = options | {};
    payload = Object.assign(options, { action: action });
    return {
      type: "postback",
      title: title,
      payload: JSON.stringify(payload)
    };
  };

  var textButton = function(title, action, options) {
    var payload = options | {};
    payload = Object.assign(options, { action: action });
    return {
      content_type: "text",
      title: title,
      payload: JSON.stringify(payload)
    };
  };
  let payloadAction = requestPayload.action
    ? requestPayload.action
    : "QR_GET_PRODUCT_LIST";
  console.log("requestPayload.action" + payloadAction);
  switch (payloadAction) {
    case "QR_GET_PRODUCT_PRICE":
      var sh_product = shopify.product.get(requestPayload.id);
      sh_product.then(function(product) {
        var options = "";
        var variants = "";

        product.variants.forEach(function(variant) {
          console.log("checking price ->" + variant.price);
          variants = variants + variant.title + ": " + variant.price + "\n";
        });

        // product.variants.map(function(variant) {
        //   variants =
        //   variants + variant.title + ": " + variant.price + "\n";
        // });
        var messageData = {
          recipient: {
            id: recipientId
          },
          message: {
            text: variants.substring(0, 640)
            // url:
            // quick_replies: [
            //   textButton("Get 3 products", "QR_GET_PRODUCT_LIST", { limit: 3 })
            // ]
          }
        };
        sendMessagetoFB(messageData);
      });

      break;

    case "QR_GET_PRODUCT_OPTIONS":
      var sh_product = shopify.product.get(requestPayload.id);
      sh_product.then(function(product) {
        var options = "";
        product.options.map(function(option) {
          options =
            options + option.name + ": " + option.values.join(",") + "\n";
        });

        var templateElements = [];

        templateElements.push({
          title: options,
          subtitle: "Sizing/Colors",
          buttons: [
            {
              type: "web_url",
              url: "https://candyboxx.com/pages/sizing",
              title: "Measure size"
            }
          ]
        });

        var messageData = {
          recipient: {
            id: recipientId
          },
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "generic",
                elements: templateElements
              }
            }
          }
        };

        sendMessagetoFB(messageData);
      });

      break;
  }
}

function sendMessagetoFB(messageData) {
  console.log("Send Message method :-" + messageData);
  request(
    {
      url: "https://graph.facebook.com/v2.6/me/messages",
      qs: { access_token: PAGE_ACCESS_TOKEN },
      method: "POST",
      json: messageData
    },
    (error, response) => {
      if (error) {
        console.log("Error sending message: ", error);
      } else if (response.body.error) {
        console.log("Error: in send message ", response.body.error);
      }
    }
  );
}

function prepareSendTextMessage(sender, aiText) {
  let messageData = { recipient: { id: sender }, message: { text: aiText } };
  sendMessagetoFB(messageData);
}

/* Webhook for API.ai to get response from the 3rd party API */
app.post("/ai", (req, res) => {
  var templateElements = [];
  switch (req.body.result.action) {
    case "shipping":
      console.log("\n\n*** Shipping *** Time Stamp :" + estTimeStamp + "\n");
      let address = req.body.result.parameters["geo-country"];

      let shippingUrl = HOST_URL + "admin/shipping_zones.json";

      console.log("\nShopify url :" + shippingUrl);
      let shipRate = 0;

      request.get(shippingUrl, (err, response, body) => {
        console.log(response + JSON.parse(body));
        if (!err && response.statusCode == 200) {
          let shipping_zones = JSON.parse(body);

          console.log("\nShopify shipping info: " + shipping_zones);

          if (address.toUpperCase() === "CANADA") {
            shipRate = "20";
          } else {
            shipRate = "45";
          }
          //   let shipRates = shipping_zones[0].weight_based_shipping_rates;

          let msg = "The shipping rate to " + address + ":" + shipRate;
          return res.json({
            speech: msg,
            displayText: msg,
            source: "shipping"
          });
        } else {
          let errorMessage = "I failed to look up the shipping.";
          return res
            .status(400)
            .json({ status: { code: 400, errorType: errorMessage } });
        }
      });
      break;

    case "search":
      console.log("\ncase - search");
      let msg = "Converted Text to JSON";
      return res.json({
        speech: msg,
        displayText: msg,
        source: "search"
      });

      break;

    case "weather":
      console.log("\n\n*** weather *** Time Stamp :" + estTimeStamp + "\n");
      let city = req.body.result.parameters["geo-city"];
      let openWeatherMapUrl =
        "http://api.openweathermap.org/data/2.5/weather?APPID=" +
        WEATHER_API_KEY +
        "&q=" +
        city;

      request.get(openWeatherMapUrl, (err, response, body) => {
        if (!err && response.statusCode == 200) {
          let json = JSON.parse(body);
          // console.log("openweathermap response --> \n" + JSON.stringify(json));
          let tempF = ~~(json.main.temp * 9 / 5 - 459.67);
          let tempC = ~~(json.main.temp - 273.15);
          let msg =
            "The current condition in " +
            json.name +
            " is " +
            json.weather[0].description +
            " and the temperature is " +
            tempF +
            " ℉ (" +
            tempC +
            " ℃).";
          return res.json({ speech: msg, displayText: msg, source: "weather" });
        } else {
          let errorMessage = "I failed to look up the city name.";
          return res
            .status(400)
            .json({ status: { code: 400, errorType: errorMessage } });
        }
      });

      break;

    case "currency":
      console.log("\n\n*** Currency *** Time Stamp :" + estTimeStamp + "\n");
      let fromCurrency = req.body.result.parameters["from-currency"];
      let toCurrency = req.body.result.parameters["to-currency"];
      // let unitCurrency = req.body.result.parameters.unit-currency['amount'];
      let fixerCurrencyUrl =
        "https://api.fixer.io/latest?base=" +
        fromCurrency +
        "&symbols=" +
        toCurrency;

      request.get(fixerCurrencyUrl, (err, response, body) => {
        if (!err && response.statusCode == 200) {
          let currecnyJson = JSON.parse(body);
          console.log(
            "\nfixerCurrencyUrl response --> \n" + JSON.stringify(currecnyJson)
          );
          let conversionRates = currecnyJson.rates[toCurrency];
          console.log(
            "\n conversionRates --> " + JSON.stringify(conversionRates)
          );

          let msg =
            "The current currency conversion rate from " +
            currecnyJson.base +
            " to " +
            toCurrency +
            " : " +
            conversionRates;
          return res.json({
            speech: msg,
            displayText: msg,
            source: "currency"
          });
        } else {
          let errorMessage = "I failed to look up the currency.";
          return res
            .status(400)
            .json({ status: { code: 400, errorType: errorMessage } });
        }
      });

    default:
    // code to be executed if n is different from first 2 cases.
  }
});
