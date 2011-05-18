// ==UserScript==
// @name        Rllmuk Topic Links View New Post
// @namespace   http://www.jonathanbuchanan.plus.com/repos/greasemonkey/
// @description Alters topic links on topic listing pages to always view the latest post
// @include     http://www.rllmukforum.com/*
// @include     http://rllmukforum.com/*
// ==/UserScript==

/* Changelog
 * ---------
 * 2010-08-02 Updated for IPB3
 * 2009-10-01 Initial version
 * -------------------------------------------------------------------------- */

// Don't do anything if we're not on a topic listing page
if (   window.location.href.indexOf("module=search") == -1
    && window.location.href.indexOf("showforum=") == -1)
{
    return;
}

var topicLinkXPathQuery = (window.location.href.indexOf("module=search") != -1
    ? "//table[@id='forum_table']/tbody/tr/td[2]/a[@title='View result']"
    : "//table[@id='forum_table']/tbody/tr/td[2]/a[@class='topic_title']");

var topicLinkNodes =
    document.evaluate(topicLinkXPathQuery, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
for (var i = 0; i < topicLinkNodes.snapshotLength; i++)
{
    var topicLinkNode = topicLinkNodes.snapshotItem(i);
    if (topicLinkNode.href.indexOf("getnewpost") == -1)
    {
        topicLinkNode.href = topicLinkNode.href + "&view=getnewpost";
    }
}
