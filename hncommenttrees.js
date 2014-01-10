// ==UserScript==
// @name        Hide/show HN comment trees
// @namespace   https://github.com/insin/greasemonkey/
// @include     https://news.ycombinator.com/item*
// @version     1
// ==/UserScript==
var comments = []

function Comment(index, el) {
  this.index = index
  this.indent = Number(el.querySelector('img[src="s.gif"]').width)

  var toggleEl = document.createElement('span')
  toggleEl.textContent = '[–]'
  toggleEl.addEventListener('click', this.toggle.bind(this))

  var bar = el.querySelector('td.default > div')
  bar.appendChild(document.createTextNode(' | '))
  bar.appendChild(toggleEl)

  this.els = {
    wrapper: el
  , comment: el.querySelector('span.comment')
  , reply: el.querySelector('span.comment + p')
  , toggle: toggleEl
  }
}

Comment.prototype.toggle = function() {
  var show = (this.els.comment.style.display == 'none')
  this.els.comment.style.display = (show ? '' : 'none')
  if (this.els.reply) this.els.reply.style.display = (show ? '' : 'none')
  this.els.toggle.textContent = (show ? '[–]' : '[+]')
  this.toggleChildren(show)
}

Comment.prototype.toggleChildren = function(show) {
  for (var i = this.index + 1; i < comments.length; i++) {
    var child = comments[i]
    if (child.indent <= this.indent) break
    child.els.wrapper.style.display = (show ? '' : 'none')
  }
}

var commentNodes = document.evaluate('/html/body/center/table/tbody/tr[3]/td/table[2]/tbody/tr', document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
for (var i = 0; i < commentNodes.snapshotLength; i++) {
  comments.push(new Comment(i, commentNodes.snapshotItem(i)))
}
