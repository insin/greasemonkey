// ==UserScript==
// @name        Rllmukzen Threadshitter
// @description Really ignore ignored users
// @namespace   https://github.com/insin/greasemonkey/
// @version     3
// @match       https://www.rllmukforum.com/index.php*
// ==/UserScript==

function addStyle(css) {
  let $style = document.createElement('style')
  $style.appendChild(document.createTextNode(css))
  document.querySelector('head').appendChild($style)
}

function TopicPage() {
  let ignoredUserIds = JSON.parse(localStorage.ignoredUserIds || '[]')

  // Hide "You've chosen to ignore content by <ignored user>"
  addStyle(`
    .ipsComment_ignored {
      display: none;
    }
  `)

  // Hide posts which quote ignored users
  function processQuotes(quotes) {
    quotes.forEach(el => {
      if (!ignoredUserIds.includes(el.dataset.ipsquoteUserid)) return
      let comment = el.closest('article.ipsComment')
      if (comment.style.display == 'none') return
      comment.style.display = 'none'
    })
  }

  function processPage() {
    processQuotes(document.querySelectorAll('[data-ipsquote-userid]'))
  }

  // Process initial posts
  processPage()

  // Watch for posts being replaced when paging
  new MutationObserver(mutations =>
    mutations.forEach(mutation => {
      if (mutation.oldValue == 'true') {
        processPage()
      }
    })
  ).observe(document.querySelector('div.cTopic'), {
    attributes: true,
    attributeFilter: ['animating'],
    attributeOldValue: true,
  })

  // Watch for new posts being loaded into the current page
  new MutationObserver(mutations =>
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(post => {
        processQuotes(post.querySelectorAll('[data-ipsquote-userid]'))
      })
    })
  ).observe(document.querySelector('#elPostFeed > form'), {
    childList: true,
  })
}

function IgnoredUsersPage() {
  // Sync ignored user ids
  localStorage.ignoredUserIds = JSON.stringify(
    Array.from(document.querySelectorAll('[data-ignoreuserid]')).map(el => el.dataset.ignoreuserid)
  )
}

let page
if (location.href.includes('index.php?/topic/')) {
  page = TopicPage
} else if (location.href.includes('index.php?/ignore/')) {
  page = IgnoredUsersPage
}

if (page) {
  page()
}
