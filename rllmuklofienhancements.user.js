// ==UserScript==
// @name        Rllmuk Lo-fi Enhancements
// @namespace   http://www.jonathanbuchanan.plus.com/repos/greasemonkey/
// @description Enhances Lo-fi mode with a "Fast Reply" form
// @include     http://www.rllmukforum.com/*
// @include     http://rllmukforum.com/*
// @include     http://www.rpsoft.co.uk/*
// @include     http://rpsoft.co.uk/*
// @include     http://www.extranoise.co.uk/*
// @include     http://extranoise.co.uk/*
// ==/UserScript==
if (!/t\d+(?:-\d+)?\.html$/.test(location.href))
{
    return;
}
else if (!GM_getValue("authKey"))
{
    var authKey = prompt("Please enter your authorisation key (View Source on a normal topic page and search for 'auth_key') - this is required to post new messages.");
    if (!authKey)
    {
        alert("Fine!");
        return;
    }
    GM_setValue("authKey", authKey);
}

var topicLink = document.evaluate("//div[@id='largetext']/a[1]",
                                  document,
                                  null,
                                  XPathResult.FIRST_ORDERED_NODE_TYPE,
                                  null).singleNodeValue;
var topicId = /(\d+)$/.exec(topicLink.href)[1];

var forumLink = document.evaluate("//div[@class='ipbnav']/a[last()]",
                                  document,
                                  null,
                                  XPathResult.FIRST_ORDERED_NODE_TYPE,
                                  null).singleNodeValue;
var forumId = /f(\d+)\.html/.exec(forumLink.href)[1];

var authKey = GM_getValue("authKey");

var fastReplyControl = document.createElement("div");
fastReplyControl.className = "smalltext";
fastReplyControl.style.textAlign = "right";
fastReplyControl.innerHTML = '<input type="button" value="Fast Reply" onclick="var f = document.getElementById(\'fastReplyForm\'); f.style.display = f.style.display == \'none\' ? \'\' : \'none\'">';

var fastReply = document.createElement("div");
fastReply.className = "smalltext";
fastReply.innerHTML = '<form id="fastReplyForm" style="display: none" method="POST" action="http://www.rllmukforum.com/index.php?">\
  <input type="hidden" name="act" value="Post">\
  <input type="hidden" name="CODE" value="03">\
  <input type="hidden" name="f" value="' + forumId + '">\
  <input type="hidden" name="t" value="' + topicId + '">\
  <input type="hidden" name="st" value="0">\
  <input type="hidden" name="auth_key" value="' + authKey + '">\
  <input type="hidden" name="fast_reply_used" value="1">\
  <textarea rows="15" cols="80" name="Post" style="height: 150px"></textarea>\
  <br>\
  <input type="submit" name="submit" value="Add Reply">\
  <input type="button" value="Close Fast Reply" onclick="this.form.style.display = \'none\'">\
</form>';

var insertionTarget = document.evaluate("//div[@class='smalltext' and last()]",
                                  document,
                                  null,
                                  XPathResult.FIRST_ORDERED_NODE_TYPE,
                                  null).singleNodeValue;
insertionTarget.parentNode.insertBefore(fastReplyControl, insertionTarget);
insertionTarget.parentNode.insertBefore(fastReply, insertionTarget);
