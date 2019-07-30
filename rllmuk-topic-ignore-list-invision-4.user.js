// ==UserScript==
// @name        Rllmuk Topic Ignore List (Invision 4)
// @description Ignore topics and forums
// @namespace   https://github.com/insin/greasemonkey/
// @version     11
// @match       https://www.rllmukforum.com/index.php*
// @grant       GM_registerMenuCommand
// @require     https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// ==/UserScript==

const IGNORED_TOPICS_STORAGE = 'rit_ignoredTopics'
const IGNORED_FORUMS_STORAGE = 'rit_ignoredForums'

let topics = []

let ignoredTopicsJson
let ignoredTopics
let ignoredTopicIds
let ignoredForumsJson
let ignoredForums
let ignoredForumIds

let config = {
  showIgnoredTopics: false,
  topicLinksLatestPost: true,
}

// Support an initial load of config from til_ prefixes to support people moving
// from the existing user script to the extension.
function loadIgnoreConfig() {
  ignoredTopicsJson = localStorage[IGNORED_TOPICS_STORAGE] || localStorage.til_ignoredTopics
  ignoredTopics = ignoredTopicsJson ? JSON.parse(ignoredTopicsJson) : []
  ignoredTopicIds = ignoredTopics.map(topic => topic.id)
  ignoredForumsJson = localStorage[IGNORED_FORUMS_STORAGE] || localStorage.til_ignoredForums
  ignoredForums = ignoredForumsJson ? JSON.parse(ignoredForumsJson) : []
  ignoredForumIds = ignoredForums.map(forum => forum.id)
}

function toggleIgnoreTopic(id, topic) {
  if (!ignoredTopicIds.includes(id)) {
    ignoredTopicIds.unshift(id)
    ignoredTopics.unshift({id})
  }
  else {
    let index = ignoredTopicIds.indexOf(id)
    ignoredTopicIds.splice(index, 1)
    ignoredTopics.splice(index, 1)
  }
  localStorage[IGNORED_TOPICS_STORAGE] = JSON.stringify(ignoredTopics)
  topic.updateClassNames()
}

function toggleIgnoreForum(id) {
  if (!ignoredForumIds.includes(id)) {
    ignoredForumIds.unshift(id)
    ignoredForums.unshift({id})
  }
  else {
    let index = ignoredForumIds.indexOf(id)
    ignoredForumIds.splice(index, 1)
    ignoredForums.splice(index, 1)
  }
  localStorage[IGNORED_FORUMS_STORAGE] = JSON.stringify(ignoredForums)
  topics.forEach(topic => topic.updateClassNames())
}

function toggleShowIgnoredTopics(showIgnoredTopics) {
  config.showIgnoredTopics = showIgnoredTopics
  topics.forEach(topic => topic.updateClassNames())
}

function addStyle(css) {
  let $style = document.createElement('style')
  $style.appendChild(document.createTextNode(css))
  document.querySelector('head').appendChild($style)
}

function UnreadContentPage() {
  const TOPIC_LINK_ID_RE = /index\.php\?\/topic\/(\d+)/
  const FORUM_LINK_ID_RE = /index\.php\?\/forum\/(\d+)/

  let view

  addStyle(`
    .rit_ignoreControl {
      visibility: hidden;
    }
    .rit_ignored {
      display: none;
    }
    .rit_ignored.rit_show {
      display: block;
      background-color: #fee;
    }
    .rit_ignored.rit_show::after {
      border-color: transparent #fee transparent transparent !important;
    }
    li.ipsStreamItem:hover .rit_ignoreControl {
      visibility: visible;
    }
    .rit_ignoreForumControl {
      opacity: 0.5;
    }
    .rit_ignoreForumControl:hover {
      opacity: 1;
    }
    .rit_ignoredForum .rit_ignoreTopicControl {
      display: none;
    }
    .rit_ignoredTopic .rit_ignoreForumControl {
      display: none;
    }
    .rit_ignoredTopic.rit_ignoredForum .rit_ignoreForumControl {
      display: inline;
    }
  `)

  function getView() {
    let $activeViewButton = document.querySelector('a.ipsButton_primary[data-action="switchView"]')
    return $activeViewButton ? $activeViewButton.textContent.trim() : null
  }

  function Topic($topic) {
    let $topicLink = $topic.querySelector('a[href*="index.php?/topic/"][data-linktype="link"]')
    let $forumLink = $topic.querySelector('a[href*="index.php?/forum/"]')
    if (!$topicLink) {
      return null
    }

    let topicId = TOPIC_LINK_ID_RE.exec($topicLink.href)[1]
    let forumId = FORUM_LINK_ID_RE.exec($forumLink.href)[1]

    let api = {
      updateClassNames() {
        let isTopicIgnored = ignoredTopicIds.includes(topicId)
        let isForumIgnored = ignoredForumIds.includes(forumId)
        $topic.classList.toggle('rit_ignoredTopic', isTopicIgnored)
        $topic.classList.toggle('rit_ignoredForum', isForumIgnored)
        $topic.classList.toggle('rit_ignored', isTopicIgnored || isForumIgnored)
        $topic.classList.toggle('rit_show', config.showIgnoredTopics && (isTopicIgnored || isForumIgnored))
      }
    }

    let $ignoreTopicContainer
    if (view == 'Condensed') {
      $ignoreTopicContainer = $topic.querySelector('ul.ipsStreamItem_stats')
      $ignoreTopicContainer.insertAdjacentHTML('beforeend', `
        <li class="rit_ignoreControl rit_ignoreTopicControl">
          <a style="cursor: pointer"><i class="fa fa-trash"></i></a>
        </li>
      `)
    }
    else {
      $ignoreTopicContainer = $topicLink.parentNode
      $ignoreTopicContainer.insertAdjacentHTML('beforeend', `
        <a style="cursor: pointer"class="rit_ignoreControl rit_ignoreTopicControl">
          <i class="fa fa-trash"></i>
        </a>
      `)
    }
    $ignoreTopicContainer.querySelector('i.fa-trash').addEventListener('click', () => {
      toggleIgnoreTopic(topicId, api)
    })

    $forumLink.parentNode.insertAdjacentHTML('beforeend', `
      <a style="cursor: pointer" class="rit_ignoreControl rit_ignoreForumControl"><i class="fa fa-trash"></i></a>
    `)
    $forumLink.parentNode.querySelector('i.fa-trash').addEventListener('click', () => {
      toggleIgnoreForum(forumId)
    })

    if (config.topicLinksLatestPost && !$topicLink.href.endsWith('&do=getNewComment')) {
      $topicLink.href += '&do=getNewComment'
    }

    return api
  }

  /**
   * Add ignore controls to a topic and hide it if it's in the ignored list.
   */
  function processTopic($topic) {
    let topic = Topic($topic)
    if (topic == null) {
      return
    }
    topics.push(topic)
    topic.updateClassNames()
  }

  /**
   * Process topics within a topic container and watch for a new topic container being added.
   * When you click "Load more activity", a new <div> is added to the end of the topic container.
   */
  function processTopicContainer($el) {
    Array.from($el.querySelectorAll(':scope > li.ipsStreamItem'), processTopic)

    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (view != getView()) {
          processView()
        }
        else if (mutation.addedNodes[0].tagName === 'DIV') {
          processTopicContainer(mutation.addedNodes[0])
        }
      })
    }).observe($el, {childList: true})
  }

  /**
   * Reset handling of topics when the view changes between Condensed and Expanded.
   */
  function processView() {
    topics = []
    view = getView()
    processTopicContainer(document.querySelector('ol.ipsStream'))
  }

  processView()
}

function ForumPage() {
  addStyle(`
    .rit_ignoreControl {
      display: table-cell;
      min-width: 24px;
      vertical-align: middle;
      visibility: hidden;
    }
    .rit_ignored {
      display: none;
    }
    .rit_ignored.rit_show {
      display: block;
      background-color: #fee !important;
    }
    @media screen and (max-width:979px) {
      .rit_ignoreControl {
        position: absolute;
        left: 12px;
        bottom: 16px;
      }
    }
    li.ipsDataItem:hover .rit_ignoreControl {
      visibility: visible;
    }
  `)

  function Topic($topic) {
    let topicId = $topic.dataset.rowid
    if (!topicId) {
      return null
    }

    let $topicLink = $topic.querySelector('h4.ipsDataItem_title a')

    let api = {
      updateClassNames() {
        let isTopicIgnored = ignoredTopicIds.includes(topicId)
        $topic.classList.toggle('rit_ignored', isTopicIgnored)
        $topic.classList.toggle('rit_show', config.showIgnoredTopics && isTopicIgnored)
      }
    }

    $topic.insertAdjacentHTML('beforeend', `
      <div class="rit_ignoreControl ipsType_light ipsType_blendLinks">
        <a style="cursor: pointer"><i class="fa fa-trash"></i></a>
      <div>
    `)

    $topic.querySelector('i.fa-trash').addEventListener('click', () => {
      toggleIgnoreTopic(topicId, api)
    })

    if (config.topicLinksLatestPost && !$topicLink.href.endsWith('&do=getNewComment')) {
      $topicLink.href += '&do=getNewComment'
    }

    return api
  }

  /**
   * Add ignore controls to a topic and hide it if it's in the ignored list.
   */
  function processTopic($topic) {
    let topic = Topic($topic)
    if (topic == null) {
      return
    }
    topics.push(topic)
    topic.updateClassNames()
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

let page
if (location.href.includes('index.php?/discover/unread')) {
  page = UnreadContentPage
}
else if (location.href.includes('index.php?/forum/')) {
  page = ForumPage
}

if (page) {
  loadIgnoreConfig()
  page()
  GM_registerMenuCommand('Toggle Ignored Topic Display', () => {
    toggleShowIgnoredTopics(!config.showIgnoredTopics)
  })
}
