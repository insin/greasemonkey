// ==UserScript==
// @name        Rllmukzen Threadshitter
// @description Really ignore ignored users
// @namespace   https://github.com/insin/greasemonkey/
// @version     1
// @match       https://www.rllmukforum.com/index.php*
// ==/UserScript==

function addStyle(css) {
  let $style = document.createElement('style')
  $style.appendChild(document.createTextNode(css))
  document.querySelector('head').appendChild($style)
}

function TopicPage() {
  // Hide "You've chosen to ignore content by <ignored user>"
  addStyle(`
    .ipsComment_ignored {
      display: none;
    }
  `)

  // Hide comments which quote ignored users
  let ignoredUserIds = JSON.parse(localStorage.ignoredUserIds || '[]')
  document.querySelectorAll('[data-ipsquote-userid]').forEach(el => {
    if (!ignoredUserIds.includes(el.dataset.ipsquoteUserid)) return
    let comment = el.closest('article.ipsComment')
    if (comment.style.display == 'none') return
    comment.style.display = 'none'
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
