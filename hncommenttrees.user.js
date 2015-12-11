// ==UserScript==
// @name        HN Comment Trees
// @description Hide/show comment trees and highlight new comments since last visit in Hacker News
// @namespace   https://github.com/insin/greasemonkey/
// @match       https://news.ycombinator.com/*
// @version     19
// ==/UserScript==

var COMMENT_COUNT_KEY = ':cc'
var LAST_VISIT_TIME_KEY = ':lv'
var MAX_COMMENT_ID_KEY = ':mc'

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
      element.appendChild(document.createTextNode(''+child))
    }
  }

  return element
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
  var commentLink = subtext.querySelector('a[href^=item]:last-child')

  // Job posts can't have comments
  this.isCommentable = (commentLink != null)
  if (!this.isCommentable) { return }
  this.id = commentLink.href.split('=').pop()
  this.commentCount = (/^\d+/.test(commentLink.textContent)
                       ? Number(commentLink.textContent.split(' ').shift())
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
 * @param {Number} lastMaxCommentId the max comment id on the previous visit,
 *   should be falsy if there was none.
 */
function HNComment(el, index, lastMaxCommentId) {
  var topBar = el.querySelector('td.default > div')
  var comment = el.querySelector('span.comment')
  var isDeleted = /^\s*\[(?:dead|deleted|flagged|flagkilled)\]\s*$/.test(comment.firstChild.nodeValue)

  this.id = (!isDeleted ? Number(topBar.querySelector('a[href^=item]').href.split('=').pop()) : -1)
  this.index = index
  this.indent = Number(el.querySelector('img[src="s.gif"]').width)

  this.isCollapsed = false
  this.isDeleted = isDeleted
  this.isNew = (!!lastMaxCommentId && this.id > lastMaxCommentId)
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
  el.insertBefore(document.createTextNode(' '), el.firstChild)
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
 * Cached getter for determining if this comment has child comments which are
 * new since the last visit to the page.
 */
HNComment.prototype.hasNewComments = function() {
  if (typeof this._hasNewComments == 'undefined') {
    var children = this.children(comments)
    var foundNewComment = false
    for (var i = 0, l = children.length; i < l; i++) {
      if (children[i].isNew) {
        foundNewComment = true
        break
      }
    }
    this._hasNewComments = foundNewComment
  }
  return this._hasNewComments
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
    this.els.topBar.appendChild(document.createTextNode(
      (this.isDeleted ? '(' : ' | (') + children.length +
      ' child' + pluralise(children.length, 'ren') + ')'
    ))
  }
}

var links = []
var comments = []

function linkPage() {
  var linkNodes = document.evaluate('//tr[@class="athing"]', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
  for (var i = 0, l = linkNodes.snapshotLength; i < l; i++) {
    var linkNode = linkNodes.snapshotItem(i)
    var metaNode = linkNode.nextElementSibling
    var link = new HNLink(linkNode, metaNode)
    var lastCommentCount = getData(link.id + COMMENT_COUNT_KEY, null)
    if (lastCommentCount != null) {
      link.lastCommentCount = Number(lastCommentCount)
    }
    links.push(link)
  }

  links.forEach(function(link) {
    link.initDOM()
  })
}

function commentPage() {
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

  var commentNodes = document.evaluate('//center/table/tbody/tr[3]/td/table[last()]/tbody/tr', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
  for (var i = 0, l = commentNodes.snapshotLength; i < l; i++) {
    var wrapper = commentNodes.snapshotItem(i)
    if (wrapper.style.height == '10px') {
      // This is a spacer row prior to a "more" link, so we've reached the end of
      // the comments.
      break
    }
    var comment = new HNComment(wrapper, i, lastMaxCommentId)
    if (comment.id > maxCommentId) {
      maxCommentId = comment.id
    }
    if (comment.isNew) {
      newCommentCount++
    }
    comments.push(comment)
  }

  function highlightNewComments(highlight) {
    comments.forEach(function(comment) {
      if (comment.isNew) {
        comment.toggleHighlighted(highlight)
      }
    })
  }

  function collapseThreadsWithoutNewComments(collapse) {
    for (var i = 0, l = comments.length; i < l; i++) {
      var comment = comments[i]
      if (!comment.isNew && !comment.hasNewComments(comments)) {
        comment.toggleCollapsed(collapse)
        i += comment.children(comments).length
      }
    }
  }

  var highlightNew = (location.search.indexOf('?shownew') != -1)

  comments.forEach(function(comment) {
    comment.addToggleControlToDOM()
  })

  var commentCount
  if (location.pathname == '/item') {
    var commentsLink = document.querySelector('td.subtext a[href^=item]:last-child')
    if (commentsLink && /^\d+/.test(commentsLink.textContent)) {
      commentCount = commentsLink.textContent.split(' ').shift()
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
            highlightNewComments(this.checked)
          })
        , ' '
        , $checkboxControl('collapse threads without new comments', highlightNew, function() {
            collapseThreadsWithoutNewComments(this.checked)
          })
        )
      ))
    }

    if (highlightNew) {
      highlightNewComments(true)
      collapseThreadsWithoutNewComments(true)
    }
  }

  if (location.pathname == '/item') {
    if (maxCommentId > lastMaxCommentId) {
      setData(maxCommentIdKey, ''+maxCommentId)
    }
    setData(lastVisitKey, ''+(new Date().getTime()))
    if (commentCount) {
      setData(itemId + COMMENT_COUNT_KEY, commentsLink.textContent.split(' ').shift())
    }
  }
}

// Initialise pagetype-specific enhancments
void function() {
  var path = location.pathname.slice(1)
  if (/^(?:$|active|ask|best|news|newest|noobstories|saved|show|submitted)/.test(path)) { return linkPage }
  if (/^item/.test(path)) { return commentPage }
  if (/^x/.test(path)) { return (document.title.indexOf('more comments') == 0 ? commentPage : linkPage) }
  return function() {}
}()()

// Always add a "saved stories" link to the top bar
var userName = document.querySelector('span.pagetop a[href^="user?id"]').textContent
var logoutLink = document.querySelector('span.pagetop a[href^="logout"]')
logoutLink.parentNode.insertBefore($el('a', {href: 'saved?id=' + userName}, 'saved stories'), logoutLink)
logoutLink.parentNode.insertBefore(document.createTextNode(' | '), logoutLink)
