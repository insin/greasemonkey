// ==UserScript==
// @name        Rllmuk Link Fixer
// @namespace   http://www.jonathanbuchanan.plus.com/repos/greasemonkey/
// @description Fixes links broken by the forum's post editing bug
// @include     http://www.rllmukforum.com/*
// @include     http://rllmukforum.com/*
// @include     http://www.rpsoft.co.uk/*
// @include     http://rpsoft.co.uk/*
// @include     http://www.extranoise.co.uk/*
// @include     http://extranoise.co.uk/*
// ==/UserScript==
for (var i = 0, l = document.links.length; i < l; i++)
{
    var link = document.links[i];
    if (!link.href || link.href.indexOf("...") == -1)
    {
        continue;
    }
    var correctLink = link.previousSibling;
    if (correctLink &&
        correctLink.nodeType === 1 &&
        correctLink.tagName.toUpperCase() == "A" &&
        correctLink.childNodes.length === 0 &&
        correctLink.href.indexOf(link.href.split("...")[0]) === 0)
    {
        link.href = correctLink.href;
    }
}