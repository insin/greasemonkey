// ==UserScript==
// @name        Rllmuk Topic Ignore List (Invision 4)
// @description Ignore topics
// @namespace   https://github.com/insin/greasemonkey/
// @match       https://www.rllmukforum.com/index.php?/discover/unread*
// @version     1
// ==/UserScript==

const TOPIC_LINK_ID_RE = /index\.php\?\/topic\/(\d+)/

let ignoredTopics = localStorage.til_ignoredTopics ? JSON.parse(localStorage.til_ignoredTopics) : []
let ignoredTopicIds = ignoredTopics.map(topic => topic.id)

function processTopic($topic) {
  let $topicLink = $topic.querySelector('a[href*="index.php?/topic/"][data-linktype="link"]')
  let id = TOPIC_LINK_ID_RE.exec($topicLink.href)[1]
  let title = $topicLink.innerText
  if (ignoredTopicIds.includes(id)) {
    $topic.style.display = 'none'
  }
  else {
    let $topicStats = $topic.querySelector('ul.ipsStreamItem_stats')
    $topicStats.insertAdjacentHTML('afterbegin', `
      <li><a style="cursor: pointer"><i class="fa fa-trash"></i></a></li>
    `)
    $topicStats.querySelector('i.fa-trash').addEventListener('click', () => {
      if (!confirm(`Are you sure you want to ignore "${title}"?`)) return
      ignoredTopics.unshift({id, title})
      localStorage.til_ignoredTopics = JSON.stringify(ignoredTopics)
      $topic.style.display = 'none'
    })
  }
}

function filterTopics($el) {
  // Hide or add ignore controls to topics
  Array.from($el.querySelectorAll(':scope > li.ipsStreamItem'), processTopic)

  // Watch for a new topic container being added
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes[0].tagName === 'DIV') {
        filterTopics(mutation.addedNodes[0])
      }
    })
  }).observe($el, {childList: true})
}

filterTopics(document.querySelector('ol.ipsStream'))
