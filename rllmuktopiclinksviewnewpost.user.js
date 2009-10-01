// ==UserScript==
// @name        Rllmuk Topic Links View New Post
// @namespace   http://www.jonathanbuchanan.plus.com/repos/greasemonkey/
// @description Alters topic links on topic listing pages to always view the latest post
// @include     http://www.rllmukforum.com/*
// @include     http://rllmukforum.com/*
// @include     http://www.pointlessdrama.co.uk/*
// @include     http://pointlessdrama.co.uk/*
// ==/UserScript==

/* Changelog
 * ---------
 * 2009-10-01 Initial version
 * -------------------------------------------------------------------------- */

// Don't do anuything if we're not on a topic listing page
if (   window.location.href.indexOf("showforum=") == -1
    && window.location.href.indexOf("act=SF") == -1
    && window.location.href.indexOf("searchid=") == -1)
{
    return;
}

var topicLinkXPathQuery = null;

// Set the xpath query and page type indicator for this page
if (window.location.href.indexOf("searchid=") > -1)
{
    topicLinkXPathQuery =
        "//div[@class='borderwrap']/table[@class='ipbtable']/tbody/tr/td[3]/table/tbody/tr/td[@width='100%']/div/a[not(@href='#')][1]";
}
else
{
    topicLinkXPathQuery =
        "//div[@class='borderwrap']/table[@class='ipbtable']/tbody/tr/td[3]/div/span[1]/a";
}

var topicLinkNodes =
    document.evaluate(topicLinkXPathQuery, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
for (var i = 0; i < topicLinkNodes.snapshotLength; i++)
{
    var topicLinkNode = topicLinkNodes.snapshotItem(i);
    console.log(topicLinkNode.href);
    if (topicLinkNode.href.indexOf("getnewpost") == -1)
    {
        topicLinkNode.href = topicLinkNode.href + "&view=getnewpost";
    }
}
