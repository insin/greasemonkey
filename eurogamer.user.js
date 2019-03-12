// ==UserScript==
// @name        Eurogamer declutter, detox & disengage
// @description Removes some clutter, hides comments and hides articles on the homepage when they're clicked
// @version     2
// @grant       none
// @match       https://www.eurogamer.net/*
// ==/UserScript==

let $style = document.createElement('style')
$style.innerText = `
/* Account section */
.desktop-header .account,
/* Space left by top ad header */
#page-wrapper > .leaderboard:first-child,
/* Spaces left by ad boxes */
.mpu,
.stack-mpu,
.game-spotlight-advertising,
/* Video section */
.below > .video-player,
/* YouTube subscription link */
figure.video figcaption,
/* Affiliate disclaimer and comment section link */
.article > footer,
/* Space left by bottom ad container */
.below > .homepage-billboard-container,
/* Space left by bottom recommendations */
.below > .recommendations,
/* YouTube links */
.playlist-actions,
/* Newsletter subscription forms */
.end,
.roadblock,
/*******************************************
 * Eurogamer's comment section is toxic AF *
 *******************************************/
a.comment-count,
#comments,
#comments-rail {
display: none !important;
}

/* Add whitespace to replace the removed footer's margin */
.article {
padding-bottom: 32px;
}

/* Don't take up extra space when stories are removed. */
.document,
.main,
.stack .grid > div {
  min-height: 0 !important;
}`
document.head.appendChild($style)

let debug = false
let ignoredGames = ['FORTNITE', 'RED DEAD REDEMPTION 2']

function xpathSelector(xpathExpression, contextNode = document) {
  let result = document.evaluate(xpathExpression, contextNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
  return result.singleNodeValue
}

function homePage() {
  // Hide the Videos heading when it appears (can't reliably target it with CSS)
  new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      for (let node of mutation.addedNodes) {
        if (node.tagName === 'P' && node.innerText === 'VIDEOS') {
          node.style.display = 'none'
        }
      }
    }
  }).observe(document.querySelector('div.below'), {childList: true})

  // Hide the Guides section
  let guidesHeading = xpathSelector('//p[@class="section-title" and text()="Guides"]', document.querySelector('div.below'))
  if (guidesHeading) {
    guidesHeading.parentNode.style.display = 'none'
  }

  let clickedArticles = JSON.parse(localStorage.getItem('clickedArticles') || '[]')

  function hideEmptySections() {
    for (let grid of document.querySelectorAll('.grid')) {
      if (grid.dataset.hidden) continue
      let allChildrenHidden = Array.from(grid.childNodes)
                                   .filter(node => node.nodeType === Node.ELEMENT_NODE)
                                   .every(node => node.style.display === 'none')
      if (allChildrenHidden) {
        grid.dataset.hidden = 'true'
        let stack = grid.closest('.stack')
        if (stack) {
          stack.style.display = 'none'
          if (stack.previousElementSibling && stack.previousElementSibling.className === 'section-title') {
            stack.previousElementSibling.style.display = 'none'
          }
        }
      }
    }
  }

  function hideClickedArticles() {
    for (link of document.querySelectorAll('p.title > a')) {
      if (clickedArticles.includes(link.pathname)) {
        let nodeToHide = link.closest('div.list-item')
        if (nodeToHide.parentNode.className.startsWith('grid-')) {
          nodeToHide = nodeToHide.parentNode
        }
        if (nodeToHide.style.display !== 'none') {
          nodeToHide.style.display = 'none'
        }
      }
    }
    hideEmptySections()
  }

  function hideIgnoredGames() {
    for (title of document.querySelectorAll('.game-spotlight-container > .section-title')) {
      if (ignoredGames.includes(title.innerText)) {
        title.closest('.game-spotlight').style.display = 'none'
      }
    }
  }

  function getClickedArticleLink(e) {
    let node = e.target
    if (node.tagName === 'SPAN' && node.classList.contains('prefix')) {
      node = node.parentNode
    }
    if (node.tagName === 'A' && /^\/articles\//.test(node.pathname)) {
      return node
    }
    return null
  }

  document.addEventListener('click', (e) => {
    let articleLink = getClickedArticleLink(e)
    if (e.button < 2 && articleLink != null) {
      // Hold ctrl + shift when clicking an article to hide it without opening it
      if (debug || (e.shiftKey && e.ctrlKey)) e.preventDefault()
      clickedArticles.unshift(articleLink.pathname)
      localStorage.setItem('clickedArticles', JSON.stringify(clickedArticles))
      hideClickedArticles()
    }
  })

  hideClickedArticles()
  hideIgnoredGames()
}

if (location.pathname === '/') {
  homePage()
}
