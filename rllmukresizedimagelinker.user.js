// ==UserScript==
// @name        Rllmuk Resized Image Linker
// @namespace   http://www.jonathanbuchanan.plus.com/repos/greasemonkey/
// @description Links resized images so you can click on the image itself to view it.
// @include     http://www.rllmukforum.com/*
// @include     http://rllmukforum.com/*
// @include     http://www.rpsoft.co.uk/*
// @include     http://rpsoft.co.uk/*
// @include     http://www.extranoise.co.uk/*
// @include     http://extranoise.co.uk/*
// ==/UserScript==

/* Changelog
 * ---------
 * 2007-03-07 Initial version.
 * -------------------------------------------------------------------------- */

var resizedImages = document.evaluate("//img[@class='linked-image']",
                                      document,
                                      null,
                                      XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                                      null);

for (var i = 0; i < resizedImages.snapshotLength; i++)
{
    var img = resizedImages.snapshotItem(i);
    var a = document.createElement("a");
    a.href = img.src;
    img.parentNode.insertBefore(a, img);
    a.appendChild(img);
}