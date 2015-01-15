// ==UserScript==
// @name        Translink WiFi Autoconnect
// @namespace   https://github.com/insin/greasemonkey/
// @description Automatically submits the Translink WiFi connection T&C page
// @include     https://portal.moovmanage.com/*
// @version     1
// @grant       none
// ==/UserScript==

var checkbox = document.querySelector('#aup_agree')
checkbox.checked = true
checkbox.form.submit()