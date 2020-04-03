// ==UserScript==
// @name        RPS declutter & disengage
// @description Removes some clutter and hides posts on the homepage when they're clicked
// @version     2
// @grant       none
// @match       https://www.rockpapershotgun.com/*
// ==/UserScript==

let $style = document.createElement('style')
$style.innerText = `
/* Space left by top ad header */
#page-wrapper > .leaderboards:first-child,
/* Spaces left by ad boxes */
.mpu,
/* Space left by bottom ad container */
.below > .billboard-container,
/* Space left by bottom recommendations */
.below > #recommendations,
/* Bargain bucket / tips sections */
.below > .spotlight-bar,
/* Subscription forms */
.newsletter-promo,
.support-us,
.support-us-promo {
    display: none !important;
}

/* Don't take up extra space when posts are removed. */
.above {
  min-height: 0 !important;
}`
document.head.appendChild($style)

let debug = false
const POST_RE = /^\/\d{4}\/\d{2}\/\d{2}\//

function postsPage() {
  let clickedPosts = JSON.parse(localStorage.getItem('clickedPosts') || '[]')

  function hideEmptySections() {
    for (let section of document.querySelectorAll('.spotlight')) {
      if (section.dataset.hidden) continue
      let allChildrenHidden = Array.from(section.childNodes)
                                   .filter(node => node.nodeType === Node.ELEMENT_NODE)
                                   .every(node => node.style.display === 'none')
      if (allChildrenHidden) {
        section.dataset.hidden = 'true'
        let container = section.closest('.spotlight-container')
        if (container) {
          container.style.display = 'none'
        }
      }
    }

    for (let section of document.querySelectorAll('.sidebar-mpu-container > .small-list')) {
      if (section.dataset.hidden) continue
      let allChildrenHidden = Array.from(section.childNodes)
                                   .filter(node => node.nodeType === Node.ELEMENT_NODE)
                                   .every(node => node.style.display === 'none')
      if (allChildrenHidden) {
        section.dataset.hidden = 'true'
        section.closest('.sidebar-mpu-container').style.display = 'none'
      }
    }
  }

  function hideClickedPosts() {
    for (link of document.querySelectorAll('p.title > a')) {
      if (clickedPosts.includes(link.pathname)) {
        let nodeToHide = link.closest('div.list-item') || link.closest('div.spotlight-item') || link.closest('article.blog-post')
        if (nodeToHide && nodeToHide.style.display !== 'none') {
          nodeToHide.style.display = 'none'
        }
      }
    }
    hideEmptySections()
  }

  function getClickHref(target) {
    if (target.tagName === 'A') return target.pathname
    if (target.tagName === 'IMG' && target.parentNode.tagName === 'A') return target.parentNode.pathname
    return ''
  }

  document.addEventListener('click', (e) => {
    if (e.button == 0 && POST_RE.test(getClickHref(e.target))) {
      // Hold ctrl + shift when clicking a post to hide it without opening it
      if (debug || (e.shiftKey && e.ctrlKey)) e.preventDefault()
      clickedPosts.unshift(getClickHref(e.target))
      localStorage.setItem('clickedPosts', JSON.stringify(clickedPosts))
      hideClickedPosts()
    }
  })

  document.addEventListener('auxclick', (e) => {
    if (e.button == 1 && POST_RE.test(getClickHref(e.target))) {
      // Hold ctrl + shift when clicking a post to hide it without opening it
      if (debug || e.ctrlKey) e.preventDefault()
      clickedPosts.unshift(getClickHref(e.target))
      localStorage.setItem('clickedPosts', JSON.stringify(clickedPosts))
      hideClickedPosts()
    }
  })

  // Handle "More posts" sidebar sections when they appear
  new MutationObserver((mutations) => {
    let newMpuContainers = false
    for (let mutation of mutations) {
      for (let node of mutation.addedNodes) {
        if (node.classList.contains('sidebar-mpu-container')) {
          newMpuContainers = true
        }
      }
    }
    if (newMpuContainers) {
      hideClickedPosts()
    }
  }).observe(document.querySelector('#right-rail'), {childList: true})

  hideClickedPosts()
}

if (/^\/(page\/\d+\/)?$/.test(location.pathname)) {
  postsPage()
}
