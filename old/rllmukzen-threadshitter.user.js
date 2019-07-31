// ==UserScript==
// @name        Rllmukzen Threadshitter
// @description Really ignore ignored users
// @namespace   https://github.com/insin/greasemonkey/
// @version     5
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

  // Hide posts containing elements which have an ignored user id as a specified
  // data attribute.
  function hidePostsByDataAttribute(elements, dataAttribute) {
    elements.forEach(el => {
      if (!ignoredUserIds.includes(el.dataset[dataAttribute])) return
      let post = el.closest('article.ipsComment')
      if (post.style.display == 'none') return
      post.style.display = 'none'
    })
  }

  // Hide posts which quote ignored users
  function processQuotes(context) {
    hidePostsByDataAttribute(
      context.querySelectorAll('[data-ipsquote-userid]'),
      'ipsquoteUserid'
    )
  }

  // Hide posts which @-mention ignored users
  function processMentions(context) {
    hidePostsByDataAttribute(
      context.querySelectorAll('[data-mentionid]'),
      'mentionid'
    )
  }

  // Hide the unread comment separator if all subseqent posts are hidden
  function updateUnreadCommentSeparator() {
    let separator = document.querySelector('hr.ipsCommentUnreadSeperator')
    if (!separator) return
    let hasVisiblePost = false
    let sibling = separator.nextElementSibling
    while (sibling) {
      if (sibling.matches('article.ipsComment') &&
          !sibling.classList.contains('ipsHide') &&
          sibling.style.display != 'none') {
        hasVisiblePost = true
        break
      }
      sibling = sibling.nextElementSibling
    }
    separator.style.display = hasVisiblePost ? '' : 'none'
  }

  // Process all posts on the current page
  function processPosts(context = document) {
    processQuotes(context)
    processMentions(context)
  }

  // Process initial posts
  processPosts()
  updateUnreadCommentSeparator()

  // Watch for posts being replaced when paging
  new MutationObserver(mutations =>
    mutations.forEach(mutation => {
      if (mutation.oldValue == 'true') {
        processPosts()
        updateUnreadCommentSeparator()
      }
    })
  ).observe(document.querySelector('div.cTopic'), {
    attributes: true,
    attributeFilter: ['animating'],
    attributeOldValue: true,
  })

  // Watch for new posts being loaded into the current page
  new MutationObserver(mutations => {
    mutations.forEach(mutation =>
      mutation.addedNodes.forEach(processPosts)
    )
    updateUnreadCommentSeparator()
  }).observe(document.querySelector('#elPostFeed > form'), {
    childList: true,
  })
}

function IgnoredUsersPage() {
  // Sync ignored user ids
  localStorage.ignoredUserIds = JSON.stringify(
    Array.from(document.querySelectorAll('[data-ignoreuserid]')).map(el =>
      el.dataset.ignoreuserid
    )
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
