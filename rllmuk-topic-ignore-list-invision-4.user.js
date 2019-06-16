// ==UserScript==
// @name        Rllmuk Topic Ignore List (Invision 4)
// @description Ignore topics and forums
// @namespace   https://github.com/insin/greasemonkey/
// @version     9
// @match       https://www.rllmukforum.com/index.php*
// @grant       GM_registerMenuCommand
// @require     https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// ==/UserScript==

let topics = []

let ignoredTopics = localStorage.til_ignoredTopics ? JSON.parse(localStorage.til_ignoredTopics) : []
let ignoredTopicIds = ignoredTopics.map(topic => topic.id)
let ignoredForums = localStorage.til_ignoredForums ? JSON.parse(localStorage.til_ignoredForums) : []
let ignoredForumIds = ignoredForums.map(forum => forum.id)

let showIgnoredTopics = false

function toggleIgnoreTopic(id, title, topic) {
  if (!ignoredTopicIds.includes(id)) {
    ignoredTopicIds.unshift(id)
    ignoredTopics.unshift({id, title})
  }
  else {
    let index = ignoredTopicIds.indexOf(id)
    ignoredTopicIds.splice(index, 1)
    ignoredTopics.splice(index, 1)
  }
  localStorage.til_ignoredTopics = JSON.stringify(ignoredTopics)
  topic.updateClassNames()
}

function toggleIgnoreForum(id, title) {
  if (!ignoredForumIds.includes(id)) {
    ignoredForumIds.unshift(id)
    ignoredForums.unshift({id, title})
  }
  else {
    let index = ignoredForumIds.indexOf(id)
    ignoredForumIds.splice(index, 1)
    ignoredForums.splice(index, 1)
  }
  localStorage.til_ignoredForums = JSON.stringify(ignoredForums)
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

  addStyle(`
    .til_ignoreControl {
      visibility: hidden;
    }
    .til_ignored {
      display: none;
    }
    .til_ignored.til_show {
      display: block;
      background-color: #fee;
    }
    .til_ignored.til_show::after {
      border-color: transparent #fee transparent transparent !important;
    }
    li.ipsStreamItem:hover .til_ignoreControl {
      visibility: visible;
    }
    .til_ignoreForumControl {
      opacity: 0.5;
    }
    .til_ignoreForumControl:hover {
      opacity: 1;
    }
    .til_ignoredForum .til_ignoreTopicControl {
      display: none;
    }
    .til_ignoredTopic .til_ignoreForumControl {
      display: none;
    }
    .til_ignoredTopic.til_ignoredForum .til_ignoreForumControl {
      display: inline;
    }
  `)

  function Topic($topic) {
    let $topicLink = $topic.querySelector('a[href*="index.php?/topic/"][data-linktype="link"]')
    let $forumLink = $topic.querySelector('a[href*="index.php?/forum/"]')
    if (!$topicLink) {
      return null
    }

    let topicId = TOPIC_LINK_ID_RE.exec($topicLink.href)[1]
    let forumId = FORUM_LINK_ID_RE.exec($forumLink.href)[1]
    let topicTitle = $topicLink.innerText.trim()
    let forumTitle = $forumLink.innerText.trim()

    let api = {
      updateClassNames() {
        let isTopicIgnored = ignoredTopicIds.includes(topicId)
        let isForumIgnored = ignoredForumIds.includes(forumId)
        $topic.classList.toggle('til_ignoredTopic', isTopicIgnored)
        $topic.classList.toggle('til_ignoredForum', isForumIgnored)
        $topic.classList.toggle('til_ignored', isTopicIgnored || isForumIgnored)
        $topic.classList.toggle('til_show', showIgnoredTopics && (isTopicIgnored || isForumIgnored))
      }
    }

    let $topicStats = $topic.querySelector('ul.ipsStreamItem_stats')
    $topicStats.insertAdjacentHTML('beforeend', `
      <li class="til_ignoreControl til_ignoreTopicControl">
        <a style="cursor: pointer"><i class="fa fa-trash"></i></a>
      </li>
    `)
    $topicStats.querySelector('i.fa-trash').addEventListener('click', () => {
      toggleIgnoreTopic(topicId, topicTitle, api)
    })

    $forumLink.parentNode.insertAdjacentHTML('beforeend', `
        <a style="cursor: pointer" class="til_ignoreControl til_ignoreForumControl"><i class="fa fa-trash"></i></a>
    `)
    $forumLink.parentNode.querySelector('i.fa-trash').addEventListener('click', () => {
      toggleIgnoreForum(forumId, forumTitle)
    })

    if (!$topicLink.href.endsWith('&do=getNewComment')) {
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
    .til_ignored {
      display: none;
    }
    .til_ignored.til_show {
      display: block;
      background-color: #fee !important;
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
      toggleIgnoreClasses($topic)
    }
    $topic.insertAdjacentHTML('beforeend', `
      <div class="til_ignoreControl ipsType_light ipsType_blendLinks">
        <a style="cursor: pointer"><i class="fa fa-trash"></i></a>
      <div>
    `)
    $topic.querySelector('i.fa-trash').addEventListener('click', () => {
      toggleIgnoreTopic(id, title, $topic)
    })
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

function toggleShowIgnoredTopics() {
  showIgnoredTopics = !showIgnoredTopics
  topics.forEach(topic => topic.updateClassNames())
}

/*
function exportIgnoredTopics() {
  fetch('https://api.github.com/gists', {
    body: JSON.stringify({
      description: 'Rllmuk Ignored Topics Export',
      files: {
        'ignoredtopics.json': {
          content: JSON.stringify(ignoredTopics)
        }
      },
      public: false,
    }),
    headers: {'Content-Type': 'application/json;charset=UTF-8'},
    method: 'POST',
    mode: 'cors',
  })
  .then(res => res.json())
  .then(response => prompt('Gist URL for exported ignored topics:', response.html_url))
  .catch(error => {
    console.error('Rllmuk Topic Ignore List error:', error)
    alert('There was an error exporting your ignored topics ⚠️')
  })
}

function importIgnoredTopics() {
  let url = prompt('Gist URL to import ignored topics from:')
  if (!/^https:\/\/gist\.github\.com\/(\w+\/)?[a-z\d]+$/.test(url)) {
    return alert('Please enter a Gist URL 🙏')
  }
  let id = url.split('/').pop()
  fetch(`https://api.github.com/gists/${id}`, {mode: 'cors'})
  .then(res => res.json())
  .then(response => {
    if (!('ignoredtopics.json' in response.files)) {
      return alert("The Gist didn't contain an ignoredtopics.json 😲")
    }
    ignoredTopics = JSON.parse(response.files['ignoredtopics.json'].content)
    ignoredTopicIds = ignoredTopics.map(topic => topic.id)
    localStorage.til_ignoredTopics = response.files['ignoredtopics.json'].content
    alert('Imported Ignored Topics - refresh the page to apply changes 🔄')
  })
  .catch(error => {
    console.error('Rllmuk Topic Ignore List error:', {url, error})
    alert('There was an error importing your ignored topics ⚠️')
  })
}
*/

let page
if (location.href.includes('index.php?/discover/unread')) {
  page = UnreadContentPage
}
else if (location.href.includes('index.php?/forum/')) {
  page = ForumPage
}

if (page) {
  page()
  GM_registerMenuCommand('Toggle Ignored Topic Display', toggleShowIgnoredTopics)
  // GM_registerMenuCommand('Export Ignored Topics', exportIgnoredTopics)
  // GM_registerMenuCommand('Import Ignored Topics', importIgnoredTopics)
}
