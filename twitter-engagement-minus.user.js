// ==UserScript==
// @name        Twitter Engagement Minus
// @description Allows hiding of Retweets and Retweetlikes (likes which appear as if they were Retweets) in your Twitter feed
// @namespace   https://github.com/insin/greasemonkey/
// @match       https://twitter.com/
// @version     1
// ==/UserScript==

// Identify retweets by by their retweet id in element data
const RETWEET_SELECTOR = 'div[data-retweet-id]'

// Identify retweetlikes by the heart icon in their context header
const RETWEETLIKE_SELECTOR = '.tweet-context .Icon--heartBadge'

// Default to hiding Retweetlikes because GTFO, Twitter
let hideRetweets = localStorage.tem_hideRetweets === 'true'
let hideRetweetLikes = localStorage.tem_hideRetweetLikes === undefined || localStorage.tem_hideRetweetLikes === 'true'

let retweetCount = 0
let retweetLikeCount = 0

let getAllTweets = () => document.querySelectorAll('#stream-items-id > .stream-item')

let $controls = document.createElement('div')
$controls.style = 'padding: 0 16px 16px 16px'
$controls.innerHTML = `
  <div>
    <label>
      <input type="checkbox" class="tem_hideRetweets">
      Hide <span class="tem_retweetCount">0</span> Retweet<span class="tem_retweetPlural">s</span>
    </label>
  </div>
  <div>
    <label>
      <input type="checkbox" class="tem_hideRetweetLikes">
      Hide <span class="tem_retweetLikeCount">0</span> Retweetlike<span class="tem_retweetLikePlural">s</span>
    </label>
  </div>
`

let $hideRetweets = $controls.querySelector('.tem_hideRetweets')
let $retweetCount = $controls.querySelector('.tem_retweetCount')
let $retweetPlural = $controls.querySelector('.tem_retweetPlural')
$hideRetweets.checked = hideRetweets
$hideRetweets.addEventListener('click', (e) => {
  hideRetweets = e.target.checked
  localStorage.tem_hideRetweets = hideRetweets
  for (let tweet of getAllTweets()) {
    if (tweet.querySelector(RETWEET_SELECTOR)) {
      tweet.style.display = hideRetweets ? 'none' : ''
    }
  }
})

let $hideRetweetLikes = $controls.querySelector('.tem_hideRetweetLikes')
let $retweetLikeCount = $controls.querySelector('.tem_retweetLikeCount')
let $retweetLikePlural = $controls.querySelector('.tem_retweetLikePlural')
$hideRetweetLikes.checked = hideRetweetLikes
$hideRetweetLikes.addEventListener('click', (e) => {
  hideRetweetLikes = e.target.checked
  localStorage.tem_hideRetweetLikes = hideRetweetLikes
  for (let tweet of getAllTweets()) {
    if (tweet.querySelector(RETWEETLIKE_SELECTOR)) {
      tweet.style.display = hideRetweetLikes ? 'none' : ''
    }
  }
})

function updateCounts() {
  $retweetCount.innerHTML = retweetCount
  $retweetPlural.innerHTML = retweetCount === 1 ? '' : 's'
  $retweetLikeCount.innerHTML = retweetLikeCount
  $retweetLikePlural.innerHTML = retweetLikeCount === 1 ? '' : 's'
}

function processTweets(tweets) {
  for (let tweet of tweets) {
    if (tweet.querySelector(RETWEETLIKE_SELECTOR)) {
      retweetLikeCount++
      if (hideRetweetLikes) {
        tweet.style.display = 'none'
      }
    }
    else if (tweet.querySelector(RETWEET_SELECTOR)) {
      retweetCount++
      if (hideRetweets) {
        tweet.style.display = 'none'
      }
    }
  }
  updateCounts()
}

// Deal with the initial batch of tweets
processTweets(getAllTweets())

// Watch the stream for the appearance of new tweets
let streamItems = document.getElementById('stream-items-id')
new MutationObserver(mutations =>
  mutations.forEach(mutation => processTweets(mutation.addedNodes))
).observe(streamItems, {childList: true})

// Show controls
let $profileCard = document.querySelector('div.ProfileCardStats')
if ($profileCard) {
  $profileCard.insertAdjacentElement('afterend', $controls)
}
