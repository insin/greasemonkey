// ==UserScript==
// @name           Amazon Price Check / Auto Buy
// @description    Refreshes a given Amazon product URL and either notifies you when it goes below a target price (using Growl for Windows at the moment only) or automatically clicks the 1-Click button for you.
// @namespace      https://github.com/insin/greasemonkey
// @include        http://www.amazon.co.uk/gp/product/*
// ==/UserScript==

// TODO Add a configuration UI
//    You have to fiddle with about:config / the defaults set below for the time being.

// Script settings & status
var enabled = GM_getValue('enabled') || true
  , productURL = GM_getValue('productURL') || 'http://www.amazon.co.uk/gp/product/B0054689MQ/'
  , targetPrice = GM_getValue('targetPrice') || 100
  , refreshTime = GM_getValue('refreshTime') || 5000
  , autoBuy = GM_getValue('autoBuy') || false
  , autoBought = GM_getValue('autoBought') || false

// Growl for Windows constants
var APP_NAME = 'Amazon Price Check / Auto Buy'
  , PRICE_CHANGE = 'pricechange'
  , AUTO_BUYING = 'autobuying'
  , ALREADY_BOUGHT = 'alreadybought'

// If we're not "enabled" or on the configured product page, don't do anything
if (!enabled || location.href.indexOf(productURL) !== 0) {
  return
}

// ================================================= Growl for Windows Setup ===

// In lieu of some sort of GM_notify API:
//
// http://www.growlforwindows.com
//    Installer for Growl for Windows.
//
// https://addons.mozilla.org/en-US/firefox/addon/growlgntp/
//    Growl/GNTP Extension for FireFox -> Growl communication. At the time of
//    typing, you need to open this extension with 7-zip or similar and tweak
//    the maxVersion setting in its install.rdf for FireFox 5 and up before you
//    can install it.

// From http://www.growlforwindows.com/gfw/help/greasemonkey.aspx
var GrowlMonkey = (function() {
  function fireGrowlEvent(type, data) {
    var element = document.createElement('GrowlEventElement')
    element.setAttribute('data', JSON.stringify(data))
    document.documentElement.appendChild(element)

    var evt = document.createEvent('Events')
    evt.initEvent(type, true, false)
    element.dispatchEvent(evt)
  }

  return {
    register: function(appName, icon, notificationTypes) {
      fireGrowlEvent('GrowlRegister', {
        appName: appName
      , icon: icon
      , notificationTypes: notificationTypes
      })
    },

    notify: function(appName, notificationType, title, text, icon) {
      fireGrowlEvent('GrowlNotify', {
        appName: appName
      , type: notificationType
      , title: title
      , text: text
      , icon: icon
      })
    }
  }
})()

// Automatically register with Growl for Windows - registering just before you
// want to send a notification doesn't always seem to work and registering every
// time doesn't seem to cause any problems.
!function registerWithGrowl() {
  GrowlMonkey.register(APP_NAME, '', [
    { name: PRICE_CHANGE
    , displayName: 'Price Changed'
    , enabled: true
    }
  , { name: AUTO_BUYING
    , displayName: 'Automatically Buying'
    , enabled: true
    }
  , { name: ALREADY_BOUGHT
    , displayName: 'Already Bought'
    , enabled: true
    }
  ])
}()

function notify(type, title, text) {
  GrowlMonkey.notify(APP_NAME, type, title, text)
}

// ================================== Price Check / Auto Buy via 1-Click (R) ===

// Salient data from product page
var productName = document.getElementById('btAsinTitle').innerHTML
  , priceText = document.querySelector('b.priceLarge').innerHTML
  , price = parseFloat(priceText.substring(1))

if (autoBought) {
  notify(ALREADY_BOUGHT,
         'Already bought the ' + productName,
         'This product has already been automatically bought before.')
  return
}

if (price <= targetPrice) {
  if (autoBuy) {
    // TODO Should we auto-disable as well?
    GM_setValue('autoBought', true)
    notify(AUTO_BUYING,
           'Automatically buying ' + productName + ' for ' + priceText,
           'Clicking the 1-Click button now...')
    // Dispatch a click event on the 1-Click button
    var evt = document.createEvent('MouseEvents')
    evt.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
    var oneClick = document.getElementById('oneClickBuyButton')
    oneClick.dispatchEvent(evt)
    return
  }
  else {
    notify(PRICE_CHANGE,
           'Price changed to ' + priceText,
           'The price of the ' + productName + ' is now under your target price of ' + targetPrice + '.')
  }
}
else {
  GM_log('Current price of ' + productName + ' (' + priceText + ') is greater than the target price (' + targetPrice + ')')
}

setTimeout(function() {
  // Stick a random number on the end to avoid getting a cached version
  window.location.href = productURL + '?apcab=' + 99999999999 * Math.random()
}, refreshTime)
