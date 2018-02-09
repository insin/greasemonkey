// ==UserScript==
// @name        Rllmuk Topic Ignore List (Invision 4)
// @description Ignore topics
// @namespace   https://github.com/insin/greasemonkey/
// @match       https://www.rllmukforum.com/index.php*
// @version     3
// ==/UserScript==

let ignoredTopics = localStorage.til_ignoredTopics ? JSON.parse(localStorage.til_ignoredTopics) : []
let ignoredTopicIds = ignoredTopics.map(topic => topic.id)

function addStyle(css) {
  let $style = document.createElement('style')
  $style.appendChild(document.createTextNode(css))
  document.querySelector('head').appendChild($style)
}

function UnreadContentPage() {
  const TOPIC_LINK_ID_RE = /index\.php\?\/topic\/(\d+)/

  addStyle(`
    .til_ignoreControl {
      visibility: hidden;
    }
    li.ipsStreamItem:hover .til_ignoreControl {
      visibility: visible;
    }
  `)

  /**
   * Hide a topic if it's in the ignored list, otherwise add ignore controls to it.
   */
  function processTopic($topic) {
    let $topicLink = $topic.querySelector('a[href*="index.php?/topic/"][data-linktype="link"]')
    let id = TOPIC_LINK_ID_RE.exec($topicLink.href)[1]
    let title = $topicLink.innerText.trim()
    if (ignoredTopicIds.includes(id)) {
      $topic.style.display = 'none'
    }
    else {
      let $topicStats = $topic.querySelector('ul.ipsStreamItem_stats')
      $topicStats.insertAdjacentHTML('beforeend', `
        <li class="til_ignoreControl">
          <a style="cursor: pointer"><i class="fa fa-trash"></i></a>
        </li>
      `)
      $topicStats.querySelector('i.fa-trash').addEventListener('click', () => {
        if (!confirm(`Are you sure you want to ignore "${title}"?`)) return
        ignoredTopics.unshift({id, title})
        localStorage.til_ignoredTopics = JSON.stringify(ignoredTopics)
        $topic.style.display = 'none'
      })
    }
  }

  /**
   * Process topics within a topic container and watch for a new topic container being added.
   * When you click "Load more activity", a new <div> is added to the end of the topic container.
   */
  function processTopicContainer($el) {
    Array.from($el.querySelectorAll(':scope > li.ipsStreamItem'), processTopic)

    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes[0].tagName === 'DIV') {
          processTopicContainer(mutation.addedNodes[0])
        }
      })
    }).observe($el, {childList: true})
  }

  processTopicContainer(document.querySelector('ol.ipsStream'))
}

function ForumPage() {
  addStyle(`
    .til_ignoreControl {
      display: table-cell;
      min-width: 24px;
      vertical-align: middle;
      visibility: hidden;
    }
    @media screen and (max-width:979px) {
      .til_ignoreControl {
        position: absolute;
        left: 12px;
        bottom: 16px;
      }
    }
    li.ipsDataItem:hover .til_ignoreControl {
      visibility: visible;
    }
  `)

  /**
   * Hide a topic if it's in the ignored list, otherwise add ignore controls to it.
   */
  function processTopic($topic) {
    let id = $topic.dataset.rowid
    if (!id) return
    let $topicLink = $topic.querySelector('h4.ipsDataItem_title > a')
    let title = $topicLink.innerText.trim()
    if (ignoredTopicIds.includes(id)) {
      $topic.style.display = 'none'
    }
    else {
      $topic.insertAdjacentHTML('beforeend', `
        <div class="til_ignoreControl ipsType_light ipsType_blendLinks">
          <a style="cursor: pointer"><i class="fa fa-trash"></i></a>
        <div>
      `)
      $topic.querySelector('i.fa-trash').addEventListener('click', () => {
        if (!confirm(`Are you sure you want to ignore "${title}"?`)) return
        ignoredTopicIds.unshift(id)
        ignoredTopics.unshift({id, title})
        localStorage.til_ignoredTopics = JSON.stringify(ignoredTopics)
        $topic.style.display = 'none'
      })
    }
  }

  // Initial list of topics
  Array.from(document.querySelectorAll('ol.cTopicList > li.ipsDataItem[data-rowid]'), processTopic)

  // Watch for topics being replaced when paging
  new MutationObserver(mutations =>
    mutations.forEach(mutation =>
      Array.from(mutation.addedNodes).filter(node => node.nodeType === Node.ELEMENT_NODE).map(processTopic)
    )
  ).observe(document.querySelector('ol.cTopicList'), {childList: true})
}

if (location.href.includes('index.php?/discover/unread')) {
  UnreadContentPage()
}
else if (location.href.includes('index.php?/forum/')) {
  ForumPage()
}
