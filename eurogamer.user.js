// ==UserScript==
// @name        Eurogamer declutter, detox & disengage
// @description Removes some clutter, hides comments and hides articles on the homepage when they're clicked
// @version     5
// @grant       none
// @match       https://www.eurogamer.net/*
// ==/UserScript==

let $style = document.createElement('style')
$style.innerText = `
/* Account section */
.user_profile.signed_out,
/* Video section */
#content_below .video_player,
/* Merch */
.merch_component,
.supporter_promo,
/* Latest sidebar */
.article_slot.deals,
.article_slot.supporter,
/*******************************************
 * Eurogamer's comment section is toxic AF *
 *******************************************/
#comments,
p.comments {
  display: none !important;
}

/* Don't take up extra space when stories are removed */
#content_above {
  min-height: 0 !important;
}

/* Fill space when stories are removed */
#app_wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
#page_wrapper {
  flex: 1;
  display: flex
}
`
document.head.appendChild($style)

let debug = false

function xpathSelector(xpathExpression, contextNode = document) {
  let result = document.evaluate(xpathExpression, contextNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
  return result.singleNodeValue
}

function homePage() {
  // Hide the Guides section
  let guidesHeading = xpathSelector('//h2[@class="section_title" and text()="Guides"]', document.querySelector('#content_below'))
  if (guidesHeading) {
    guidesHeading.parentNode.style.display = 'none'
  }

  let clickedArticles = JSON.parse(localStorage.getItem('clickedArticles') || '[]')

  function hideEmptySections() {
    for (let list of document.querySelectorAll('section.shelf ul.summary_list')) {
      if (list.dataset.hidden) continue
      let allArticlesHidden = Array.from(list.querySelectorAll('article.summary'))
                                   .every(article => article.style.display === 'none')
      if (allArticlesHidden) {
        list.dataset.hidden = 'true'
        list.closest('section.shelf').style.display = 'none'
      }
    }
  }

  function hideClickedArticles() {
    for (link of document.querySelectorAll('p.title > a')) {
      if (clickedArticles.includes(link.pathname)) {
        let nodeToHide = link.closest('article.summary')
        if (nodeToHide && nodeToHide.style.display !== 'none') {
          nodeToHide.style.display = 'none'
        }
      }
    }
    hideEmptySections()
  }

  function getClickedArticleLink(e) {
    let node = e.target
    if (node.tagName === 'A' && node.parentElement.tagName === 'P' && node.parentElement.className === 'title') {
      return node
    }
    return null
  }

  function markAllAsRead(e) {
    e.preventDefault()
		for (link of document.querySelectorAll('p.title > a')) {
      if (!clickedArticles.includes(link.pathname)) {
        clickedArticles.unshift(link.pathname)
      }
    }
    localStorage.setItem('clickedArticles', JSON.stringify(clickedArticles))
    hideClickedArticles()
  }

  document.addEventListener('click', (e) => {
    let articleLink = getClickedArticleLink(e)
    if (e.button == 0 && articleLink != null) {
      // Hold ctrl + shift when clicking an article to hide it without opening it
      if (debug || (e.shiftKey && e.ctrlKey)) e.preventDefault()
      clickedArticles.unshift(articleLink.pathname)
      localStorage.setItem('clickedArticles', JSON.stringify(clickedArticles))
      hideClickedArticles()
    }
  })

  document.addEventListener('auxclick', (e) => {
    let articleLink = getClickedArticleLink(e)
    if (e.button == 1 && articleLink != null) {
      // Hold ctrl when clicking an article to hide it without opening it
      if (debug || e.ctrlKey) e.preventDefault()
      clickedArticles.unshift(articleLink.pathname)
      localStorage.setItem('clickedArticles', JSON.stringify(clickedArticles))
      hideClickedArticles()
    }
  })

  hideClickedArticles()

  let popularNow = document.querySelector('section.spotlight h2.section_title')
  if (popularNow != null) {
    let button = document.createElement('a')
    button.className = 'button'
    button.style.float = 'right'
    button.innerText = 'Mark all as read'
    button.href = '#'
    button.addEventListener('click', markAllAsRead)
    popularNow.appendChild(button)
  }
}

if (location.pathname === '/') {
  homePage()
}
