// ==UserScript==
// @name        HN Comment Trees
// @description Hide/show comment trees and highlight new comments since last visit in Hacker News
// @namespace   https://github.com/insin/greasemonkey/
// @match       https://news.ycombinator.com/*
// @version     34
// ==/UserScript==

var COMMENT_COUNT_KEY = ':cc'
var LAST_VISIT_TIME_KEY = ':lv'
var MAX_COMMENT_ID_KEY = ':mc'

var debug = false
function LOG(...args) {
  if (!debug) return
  console.log('[HN Comment Trees]', ...args)
}

// ==================================================================== Utils ==

var Array_slice = Array.prototype.slice

function toggleDisplay(el, show) {
  el.style.display = (show ? '' : 'none')
}

/**
 * Returns the appropriate suffix based on an item count. Returns 's' for plural
 * by default.
 * @param {Number} itemCount
 * @param {String=} config plural suffix or singular and plural suffixes
 *   separated by a comma.
 */
function pluralise(itemCount, config) {
  config = config || 's'
  if (config.indexOf(',') == -1) { config = ',' + config }
  var suffixes = config.split(',').slice(0, 2)
  return (itemCount === 1 ? suffixes[0] : suffixes[1])
}

/**
 * Iterates over a list, calling the given callback with each property and
 * value. Stops iteration if the callback returns false.
 */
function forEachItem(obj, cb) {
  var props = Object.keys(obj)
  for (var i = 0, l = props.length; i < l; i++) {
    if (cb(props[i], obj[props[i]]) === false) {
      break
    }
  }
}

/**
 * Creates a DOM Element with the given tag name and attributes. Children can
 * either be given as a single list or as all additional arguments after
 * attributes.
 */
function $el(tagName, attributes, children) {
  if (!Array.isArray(children)) {
    children = Array_slice.call(arguments, 2)
  }

  var element = document.createElement(tagName)

  if (attributes) {
    forEachItem(attributes, function(prop, value) {
      if (prop.indexOf('on') === 0) {
        element.addEventListener(prop.slice(2).toLowerCase(), value)
      }
      else if (prop.toLowerCase() == 'style') {
        forEachItem(value, function(p, v) { element.style[p] = v })
      }
      else {
        element[prop] = value
      }
    })
  }

  for (var i = 0, l = children.length; i < l; i++) {
    var child = children[i]
    if (child == null || child === false) { continue }
    if (child != null && typeof child.nodeType != 'undefined') {
      // Append element children directly
      element.appendChild(children[i])
    }
    else {
      // Coerce non-element children to String and append as a text node
      element.appendChild($text(''+child))
    }
  }

  return element
}

function $text(text) {
  return document.createTextNode(text)
}

/**
 * Creates a labeled checkbox control.
 */
function $checkboxControl(labelText, defaultChecked, eventListener) {
  return $el('label', {}
  , $el('input', {type: 'checkbox', checked: defaultChecked, onClick: eventListener})
  , ' '
  , labelText
  )
}

/**
 * Gets data from localStorage.
 */
function getData(name, defaultValue) {
  var value = localStorage[name]
  return (typeof value != 'undefined' ? value : defaultValue)
}

/**
 * Sets data im localStorage.
 */
function setData(name, value) {
  localStorage[name] = value
}

// =================================================================== HNLink ==

function HNLink(linkEl, metaEl) {
  var subtext = metaEl.querySelector('td.subtext')
  var commentLink = [...subtext.querySelectorAll('a[href^=item]')].pop()

  // Job posts can't have comments
  this.isCommentable = (commentLink != null)
  if (!this.isCommentable) { return }
  this.id = commentLink.href.split('=').pop()
  this.commentCount = (/^\d+/.test(commentLink.textContent)
                       ? Number(commentLink.textContent.split(/\s/).shift())
                       : null)
  this.lastCommentCount = null

  this.els = {
    link: linkEl
  , meta: metaEl
  , subtext: subtext
  }
}

HNLink.prototype.initDOM = function() {
  if (!this.isCommentable) {
    return
  }
  if (this.commentCount != null &&
      this.lastCommentCount != null &&
      this.commentCount > this.lastCommentCount) {
    var newCommentCount = this.commentCount - this.lastCommentCount
    this.els.subtext.appendChild($el('span', null
    , ' ('
    , $el('a', {href: '/item?shownew&id=' + this.id, style: {fontWeight: 'bold'}}
      , newCommentCount
      , ' new'
      )
    , ')'
    ))
  }
}

// ================================================================ HNComment ==

/**
 * @param {Element} el the DOM element wrapping the entire comment.
 * @param {Number} index the index of the comment in the list of comments.
 */
function HNComment(el, index) {
  var topBar = el.querySelector('td.default > div')
  var comment = el.querySelector('div.comment')
  var isDeleted = /^\s*\[\w+\]\s*$/.test(comment.firstChild.nodeValue)

  if (isDeleted) {
    this.id = -1
    this.when = ''
  }
  else {
    var permalink = topBar.querySelector('a[href^=item]')
    this.id = Number(permalink.href.split('=').pop())
    this.when = permalink.textContent
  }
  
  this.index = index
  this.indent = Number(el.querySelector('img[src="s.gif"]').width)

  this.isCollapsed = false
  this.isDeleted = isDeleted
  this.isTopLevel = (this.indent === 0)

  this.els = {
    wrapper: el
  , topBar: topBar
  , vote: el.querySelector('td[valign="top"] > center')
  , comment: comment
  , reply: el.querySelector('span.comment + div.reply')
  , toggleControl: $el('span', {
      style: {cursor: 'pointer'}
    , onClick: function() { this.toggleCollapsed() }.bind(this)
    }, '[–]')
  }
}

HNComment.prototype.addToggleControlToDOM = function() {
  // We want to use the comment metadata bar for the toggle control, so put it
  // back above the [deleted] placeholder.
  if (this.isDeleted) {
    this.els.topBar.style.marginBottom = '4px';
  }
  var el = this.els.topBar
  el.insertBefore($text(' '), el.firstChild)
  el.insertBefore(this.els.toggleControl, el.firstChild)
}

/**
 * Cached getter for child comments - that is, any comments immediately
 * following this one which have a larger indent.
 */
HNComment.prototype.children = function() {
  if (typeof this._children == 'undefined') {
    this._children = []
    for (var i = this.index + 1, l = comments.length; i < l; i++) {
      var child  = comments[i]
      if (child.indent <= this.indent) { break }
      this._children.push(child)
    }
  }
  return this._children
}

/**
 * Determine if this comment has child comments which are new based on a
 * reference comment id.
 */
HNComment.prototype.hasNewComments = function(referenceCommentId) {
  var children = this.children(comments)
  var foundNewComment = false
  for (var i = 0, l = children.length; i < l; i++) {
    if (children[i].isNew(referenceCommentId)) {
      foundNewComment = true
      break
    }
  }
  return foundNewComment
}

/**
 * Determine if this comment is new based on a reference comment id.
 */
HNComment.prototype.isNew = function(referenceCommentId) {
  return (!!referenceCommentId && this.id > referenceCommentId)
}

/**
 * If given a new collapse state, applies it. Otherwise toggles the current
 * collapsed state.
 * @param {Boolean=} collapse.
 */
HNComment.prototype.toggleCollapsed = function(collapse) {
  if (arguments.length === 0) {
    collapse = !this.isCollapsed
  }
  this._updateDOMCollapsed(!collapse)
  this.isCollapsed = collapse
}

HNComment.prototype.toggleHighlighted = function(highlight) {
  this.els.wrapper.style.backgroundColor = (highlight ? '#ffffde' : 'transparent')
}

/**
 * @param {Boolean} show.
 */
HNComment.prototype._updateDOMCollapsed = function(show) {
  toggleDisplay(this.els.comment, show)
  if (this.els.reply) {
    toggleDisplay(this.els.reply, show)
  }
  if (this.els.vote) {
    this.els.vote.style.visibility = (show ? 'visible' : 'hidden')
  }
  this.els.toggleControl.textContent = (show ? '[–]' : '[+]')
  var children = this.children()
  children.forEach(function(child) {
    toggleDisplay(child.els.wrapper, show)
  })
  if (show) {
    this.els.topBar.removeChild(this.els.topBar.lastChild)
  }
  else {
    this.els.topBar.appendChild($text(
      (this.isDeleted ? '(' : ' | (') + children.length +
      ' child' + pluralise(children.length, 'ren') + ')'
    ))
  }
}

var links = []

function linkPage() {
  LOG('>>> linkPage')
  var linkNodes = document.evaluate('//tr[@class="athing"]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
  LOG('linkNodes.snapshotLength', linkNodes.snapshotLength)
  for (var i = 0, l = linkNodes.snapshotLength; i < l; i++) {
    var linkNode = linkNodes.snapshotItem(i)
    var metaNode = linkNode.nextElementSibling
    var link = new HNLink(linkNode, metaNode)
    var lastCommentCount = getData(link.id + COMMENT_COUNT_KEY, null)
    if (lastCommentCount != null) {
      link.lastCommentCount = Number(lastCommentCount)
    }
    LOG(link)
    links.push(link)
  }

  links.forEach(function(link) {
    link.initDOM()
  })
  LOG('<<< linkPage')
}

var comments = []
var commentsById = {}

function commentPage() {
  LOG('>>> commentPage')

  // Hide new built-in comment toggling
  var style = document.createElement('style')
  style.type = 'text/css'
  style.innerHTML = 'a.togg { display: none; }'
  document.getElementsByTagName('head')[0].appendChild(style)

  var itemId = location.search.split('=').pop()
  var maxCommentIdKey = itemId + MAX_COMMENT_ID_KEY
  var lastVisitKey = itemId + LAST_VISIT_TIME_KEY
  var lastMaxCommentId = Number(getData(maxCommentIdKey, '0'))
  var lastVisit = getData(lastVisitKey, null)
  if (typeof lastVisit != 'undefined') {
    lastVisit = new Date(Number(lastVisit))
  }
  var maxCommentId = -1
  var newCommentCount = 0
  LOG({itemId, maxCommentIdKey, lastVisitKey, lastMaxCommentId, lastVisit})

  var commentNodes = document.evaluate('//table[@class="comment-tree"]//tr[contains(@class,"athing")]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
  LOG('commentNodes.snapshotLength', commentNodes.snapshotLength)

  for (var i = 0, l = commentNodes.snapshotLength; i < l; i++) {
    var wrapper = commentNodes.snapshotItem(i)
    var comment = new HNComment(wrapper, i)
    if (comment.id > maxCommentId) {
      maxCommentId = comment.id
    }
    if (comment.isNew(lastMaxCommentId)) {
      newCommentCount++
    }
    comments.push(comment)
    if (comment.id !== -1) {
      commentsById[comment.id] = comment
    }
  }
  LOG({maxCommentId, newCommentCount})

  function highlightNewComments(highlight, referenceCommentId) {
    comments.forEach(function(comment) {
      if (comment.isNew(referenceCommentId)) {
        comment.toggleHighlighted(highlight)
      }
    })
  }

  function collapseThreadsWithoutNewComments(collapse, referenceCommentId) {
    for (var i = 0, l = comments.length; i < l; i++) {
      var comment = comments[i]
      if (!comment.isNew(referenceCommentId) && !comment.hasNewComments(referenceCommentId)) {
        comment.toggleCollapsed(collapse)
        i += comment.children(comments).length
      }
    }
  }

  var highlightNew = (location.search.indexOf('?shownew') != -1)

  comments.forEach(function(comment) {
    comment.addToggleControlToDOM()
  })

  var commentCount = 0
  if (location.pathname == '/item') {
    var commentsLink = document.querySelector('td.subtext > a[href^=item]')
    if (commentsLink && /^\d+/.test(commentsLink.textContent)) {
      commentCount = Number(commentsLink.textContent.split(/\s/).shift())
    }
  }

  if (lastVisit && newCommentCount > 0) {
    var el = (document.querySelector('form[action="/r"]') ||
              document.querySelector('td.subtext'))
    if (el) {
      el.appendChild($el('div', null
      , $el('p', null
        , (newCommentCount + ' new comment' + pluralise(newCommentCount) +
           ' since ' + lastVisit.toLocaleString())
        )
      , $el('div', null
        , $checkboxControl('highlight new comments', highlightNew, function() {
            highlightNewComments(this.checked, lastMaxCommentId)
          })
        , ' '
        , $checkboxControl('collapse threads without new comments', highlightNew, function() {
            collapseThreadsWithoutNewComments(this.checked, lastMaxCommentId)
          })
        )
      ))
    }

    if (highlightNew) {
      highlightNewComments(true, lastMaxCommentId)
      collapseThreadsWithoutNewComments(true, lastMaxCommentId)
    }
  }
  else if (commentCount > 1) {
    var sortedCommentIds = comments.map(comment => comment.id)
                                   .filter(id => id !== -1)
                                   .sort((a, b) => a - b)
    var showNewCommentsAfter = sortedCommentIds.length - 1

    var el = (document.querySelector('form[action="/r"]') ||
              document.querySelector('td.subtext'))
    
    function getButtonLabel() {
      var howMany = sortedCommentIds.length - showNewCommentsAfter
      var fromWhen = commentsById[sortedCommentIds[showNewCommentsAfter]].when
      return `highlight ${howMany} comment${pluralise(howMany)} from ${fromWhen}`
    }
    
    var $buttonLabel = $el('span', null, getButtonLabel())
    var $range = $el('input', {
      type: 'range',
      min: 1,
      max: sortedCommentIds.length - 1,
      onInput(e) {
        showNewCommentsAfter = Number(e.target.value)
        $buttonLabel.innerText = getButtonLabel()
      },
      style: {margin: 0, verticalAlign: 'middle'},
      value: sortedCommentIds.length - 1,
    })
    var $button = $el('button', {
      type: 'button',
      onClick(e) {
        var referenceCommentId = sortedCommentIds[showNewCommentsAfter - 1]
        highlightNewComments(true, referenceCommentId)
        collapseThreadsWithoutNewComments(true, referenceCommentId)
        el.removeChild($timeTravelControl)
      },
      style: {fontFamily: 'monospace', fontSize: '10pt'}
    }, $buttonLabel)
    var $timeTravelControl = $el('div', {style: {marginTop: '1em'}}, $range, ' ', $button)
  
    el.appendChild($timeTravelControl)
  }

  if (location.pathname == '/item') {
    if (maxCommentId > lastMaxCommentId) {
      setData(maxCommentIdKey, ''+maxCommentId)
    }
    setData(lastVisitKey, ''+(new Date().getTime()))
    if (commentCount) {
      setData(itemId + COMMENT_COUNT_KEY, commentsLink.textContent.split(/\s/).shift())
    }
  }
  LOG('<<< commentPage')
}

// Initialise pagetype-specific enhancments
void function() {
  var path = location.pathname.slice(1)
  if (/^(?:$|active|ask|best|news|newest|noobstories|show|submitted|upvoted)/.test(path)) { return linkPage }
  if (/^item/.test(path)) { return commentPage }
  if (/^x/.test(path)) { return (document.title.indexOf('more comments') == 0 ? commentPage : linkPage) }
  return function() {}
}()()

// Add an "upvoted" link to the top bar
if (window.location.pathname !== '/upvoted') {
  var userName = document.querySelector('span.pagetop a[href^="user?id"]').textContent
  var pageTop = document.querySelector('span.pagetop')
  pageTop.appendChild($text(' | '))
  pageTop.appendChild($el('a', {href: '/upvoted?id=' + userName}, 'upvoted'))
}
