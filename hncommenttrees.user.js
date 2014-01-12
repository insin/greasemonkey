// ==UserScript==
// @name        HN Comment Trees
// @description Adds Reddit-style [–]/[+] widgets to hide/show comment trees in Hacker News
// @namespace   https://github.com/insin/greasemonkey/
// @include     https://news.ycombinator.com/item*
// @version     2
// ==/UserScript==
var comments = []

function toggle(el, show) {
  el.style.display = (show ? '' : 'none')
}

function Comment(index, el) {
  this.index = index
  this.indent = Number(el.querySelector('img[src="s.gif"]').width)

  var toggleEl = document.createElement('span')
  toggleEl.textContent = '[–]'
  toggleEl.style.cursor = 'pointer'
  toggleEl.addEventListener('click', this.onToggle.bind(this))

  var bar = el.querySelector('td.default > div')
  bar.insertBefore(document.createTextNode(' '), bar.firstChild)
  bar.insertBefore(toggleEl, bar.firstChild)

  this.els = {
    wrapper: el
  , bar: bar
  , vote: el.querySelector('td[valign="top"] > center')
  , comment: el.querySelector('span.comment')
  , reply: el.querySelector('span.comment + p')
  , toggle: toggleEl
  }
}

Comment.prototype.onToggle = function() {
  var show = (this.els.comment.style.display == 'none')
  toggle(this.els.comment, show)
  if (this.els.reply) toggle(this.els.reply, show)
  if (this.els.vote) this.els.vote.style.visibility = (show ? 'visible' : 'hidden')
  this.els.toggle.textContent = (show ? '[–]' : '[+]')
  var childCount = this.toggleChildren(show)
  if (show) {
    this.els.bar.removeChild(this.els.bar.lastChild)
  }
  else {
    this.els.bar.appendChild(document.createTextNode(
      ' | (' + childCount + ' child' + (childCount != 1 ? 'ren' : '') + ')'
    ))
  }
}

Comment.prototype.toggleChildren = function(show) {
  for (var i = this.index + 1; i < comments.length; i++) {
    var child = comments[i]
    if (child.indent <= this.indent) break
    toggle(child.els.wrapper, show)
  }
  return (i - this.index - 1)
}

var commentNodes = document.evaluate('/html/body/center/table/tbody/tr[3]/td/table[2]/tbody/tr', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
for (var i = 0; i < commentNodes.snapshotLength; i++) {
  comments.push(new Comment(i, commentNodes.snapshotItem(i)))
}
