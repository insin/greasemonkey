// ==UserScript==
// @name        Cook'd and Bomb'd Ignore Topics
// @description Ignore topics
// @namespace   https://github.com/insin/greasemonkey/
// @version     1
// @match       https://www.cookdandbombd.co.uk/forums/index.php/board*
// @grant       GM_registerMenuCommand
// @require     https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// ==/UserScript==

const IGNORED_TOPICS_STORAGE = 'cab_ignoredTopics'
const TOPIC_ID_RE = /topic,(\d+)/

let topics = []

let ignoredTopicIds

let config = {
  showIgnoredTopics: false,
}

function loadIgnoreConfig() {
  let ignoredTopicsJson = localStorage[IGNORED_TOPICS_STORAGE]
  ignoredTopicIds = ignoredTopicsJson ? JSON.parse(ignoredTopicsJson) : []
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
    .cab_ignoreTopic {
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
    tr:hover .cab_ignoreTopic {
      visibility: visible;
    }
  `)

  function Topic($topicRow) {
    let $topicLink = $topicRow.querySelector('td.subject a')
    let $lastPostLink = $topicRow.querySelector('td.lastpost a')

    let topicIdMatch = TOPIC_ID_RE.exec($lastPostLink.href)
    if (!topicIdMatch) {
      return null
    }
    let topicId = topicIdMatch[1]

    let api = {
      updateClassNames() {
        let isTopicIgnored = ignoredTopicIds.includes(topicId)
        $topicRow.classList.toggle('cab_ignored', isTopicIgnored)
        $topicRow.classList.toggle('cab_show', config.showIgnoredTopics && isTopicIgnored)
      }
    }

    $lastPostLink.insertAdjacentHTML('afterend', `
      <a href="#" class="cab_ignoreTopic">
        <img src="/forums/Themes/default/images/icons/delete.gif" alt="Ignore topic" title="Ignore topic" width="14" height="14">
      </a>
    `)

    $topicRow.querySelector('a.cab_ignoreTopic').addEventListener('click', (e) => {
      e.preventDefault()
      toggleIgnoreTopic(topicId, api)
    })

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

  Array.from(document.querySelectorAll('#messageindex table.table_grid tbody tr'), processTopicRow)
}

loadIgnoreConfig()
ForumPage()
GM_registerMenuCommand('Toggle Ignored Topic Display', () => {
  toggleShowIgnoredTopics(!config.showIgnoredTopics)
})