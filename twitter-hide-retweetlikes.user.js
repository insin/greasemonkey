// ==UserScript==
// @name        Hide Twitter Retweetlikes
// @description Hides retweetlikes (likes which appear as if they were retweets) from your Twitter feed
// @namespace   https://github.com/insin/greasemonkey/
// @match       https://twitter.com/
// @version     1
// ==/UserScript==

// Identify retweetlikes by the heart icon in their context header
const TWEET_CONTEXT_SELECTOR = '.tweet-context .Icon--heartBadge'

// Hide all initial retweetlikes
for (let tweetContext of document.querySelectorAll(TWEET_CONTEXT_SELECTOR)) {
  tweetContext.parentNode.parentNode.parentNode.parentNode.style.display = 'none'
}

// Watch the stream for the appearance of new retweetlikes and hide them
let streamItems = document.getElementById('stream-items-id')
new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    for (let streamItem of mutation.addedNodes) {
      if (streamItem.querySelector(TWEET_CONTEXT_SELECTOR)) {
        streamItem.style.display = 'none'
      }
    }
  })
}).observe(streamItems, {childList: true})
