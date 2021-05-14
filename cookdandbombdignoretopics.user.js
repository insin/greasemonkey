// ==UserScript==
// @name        Cook'd and Bomb'd Ignore Topics
// @description Ignore topics and forums, and other forum page enhancements
// @namespace   https://github.com/insin/greasemonkey/
// @version     6
// @match       https://www.cookdandbombd.co.uk/forums/index.php/board*
// @match       https://www.cookdandbombd.co.uk/forums/index.php?action=unread*
// @grant       GM.registerMenuCommand
// @require     https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// ==/UserScript==

const IGNORED_TOPICS_STORAGE = 'cab_ignoredTopics'
const IGNORED_FORUMS_STORAGE = 'cab_ignoredForums'

// Logged out: index.php/topic,12345
// Logged in: index.php?topic=12345
const TOPIC_ID_RE = /index.php[?/]topic[,=](\d+)/
// Only in Recent Unread Topics - must be logged in
const FORUM_ID_RE = /index.php\/board,(\d+)/

let topics = []

let ignoredTopicIds
let ignoredForumIds

let config = {
  showIgnoredTopics: false,
  hideTopicPageNumbers: true,
  topicLinksNewOrLastPost: true,
}

function loadIgnoreConfig() {
  let ignoredTopicsJson = localStorage[IGNORED_TOPICS_STORAGE]
  let ignoredForumsJson = localStorage[IGNORED_FORUMS_STORAGE]
  ignoredTopicIds = ignoredTopicsJson ? JSON.parse(ignoredTopicsJson) : []
  ignoredForumIds = ignoredForumsJson ? JSON.parse(ignoredForumsJson) : []
}

function toggleIgnoreTopic(id, topic) {
  if (!ignoredTopicIds.includes(id)) {
    ignoredTopicIds.unshift(id)
  }
  else {
    let index = ignoredTopicIds.indexOf(id)
    ignoredTopicIds.splice(index, 1)
  }
  localStorage[IGNORED_TOPICS_STORAGE] = JSON.stringify(ignoredTopicIds)
  topic.updateClassNames()
}

function toggleIgnoreForum(id) {
  if (!ignoredForumIds.includes(id)) {
    ignoredForumIds.unshift(id)
  }
  else {
    let index = ignoredForumIds.indexOf(id)
    ignoredForumIds.splice(index, 1)
  }
  localStorage[IGNORED_FORUMS_STORAGE] = JSON.stringify(ignoredForumIds)
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

function ForumPage() {
  addStyle(`
    .cab_ignoreControl {
      visibility: hidden;
    }
    .cab_ignored {
      display: none;
    }
    .cab_ignored.cab_show {
      display: table-row;
    }
    .cab_ignored.cab_show td {
      background-color: #fdd !important;
    }
    tr:hover .cab_ignoreControl {
      visibility: visible;
    }
    .cab_ignoredForum .cab_ignoreTopic {
      display: none;
    }
    .cab_ignoredTopic .cab_ignoreForum {
      display: none;
    }
    .cab_ignoredTopic.cab_ignoredForum .cab_ignoreForum {
      display: inline;
    }
    ${config.hideTopicPageNumbers ? 'td.subject small { display: none; }' : ''}
  `)

  function Topic($topicRow) {
    let $topicLink = $topicRow.querySelector('td.subject a')
    // Only in Recent Unread Topics
    let $forumLink = $topicRow.querySelector('td.subject p > em > a')
    let $lastPostLink = $topicRow.querySelector('td.lastpost a')

    let topicIdMatch = TOPIC_ID_RE.exec($lastPostLink.href)
    if (!topicIdMatch) {
      return null
    }
    let topicId = topicIdMatch[1]

    let forumId = null
    if ($forumLink) {
      let forumIdMatch = FORUM_ID_RE.exec($forumLink.href)
      if (forumIdMatch) {
        forumId = forumIdMatch[1]
      }
    }

    let api = {
      updateClassNames() {
        let isTopicIgnored = ignoredTopicIds.includes(topicId)
        let isForumIgnored = forumId ? ignoredForumIds.includes(forumId) : false
        $topicRow.classList.toggle('cab_ignoredTopic', isTopicIgnored)
        $topicRow.classList.toggle('cab_ignoredForum', isForumIgnored)
        $topicRow.classList.toggle('cab_ignored', isTopicIgnored || isForumIgnored)
        $topicRow.classList.toggle('cab_show', config.showIgnoredTopics && (isTopicIgnored || isForumIgnored))
      }
    }

    $lastPostLink.insertAdjacentHTML('afterend', `
      <a href="#" class="cab_ignoreControl cab_ignoreTopic">
        <img src="/forums/Themes/default/images/icons/delete.gif" alt="Ignore topic" title="Ignore topic" width="14" height="14">
      </a>
    `)

    $topicRow.querySelector('a.cab_ignoreTopic').addEventListener('click', (e) => {
      e.preventDefault()
      toggleIgnoreTopic(topicId, api)
    })

    if (forumId) {
      $forumLink.parentElement.insertAdjacentHTML('afterend', `
        <a href="#" class="cab_ignoreControl cab_ignoreForum">
          <img src="/forums/Themes/default/images/icons/delete.gif" alt="Ignore forum" title="Ignore forum" width="14" height="14">
        </a>
      `)
      $topicRow.querySelector('a.cab_ignoreForum').addEventListener('click', (e) => {
        e.preventDefault()
        toggleIgnoreForum(forumId)
      })
    }

    if (config.topicLinksNewOrLastPost) {
      let $newPostLink = $topicRow.querySelector('a[id^=newicon]')
      $topicLink.href = $newPostLink ? $newPostLink.href : $lastPostLink.href
    }

    return api
  }

  /**
   * Add ignore controls to a topic and hide it if it's being ignored.
   */
  function processTopicRow($topicRow) {
    let topic = Topic($topicRow)
    if (topic == null) {
      return
    }
    topics.push(topic)
    topic.updateClassNames()
  }

  Array.from(document.querySelectorAll('#main_content_section table.table_grid tbody tr'), processTopicRow)
}

// Already-processed pages seem to be getting cached on back navigation… sometimes
if (!document.querySelector('a.cab_ignoreTopic')) {
  loadIgnoreConfig()
  ForumPage()
  GM.registerMenuCommand('Toggle Ignored Topic Display', () => {
    toggleShowIgnoredTopics(!config.showIgnoredTopics)
  })
}
