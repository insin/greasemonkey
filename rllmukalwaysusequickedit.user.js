// ==UserScript==
// @name        Rllmuk Always Use Quick Edit
// @namespace   http://www.jonathanbuchanan.plus.com/repos/greasemonkey/
// @description Modifies post Edit buttons to always use Quick Edit.
// @include     http://www.rllmukforum.com/*
// ==/UserScript==

/* Changelog
 * ---------
 * 2006-04-01 Initial version.
 * -------------------------------------------------------------------------- */

// Only run on topic pages
if (   window.location.href.indexOf("showtopic=") == -1
    && window.location.href.indexOf("act=ST") == -1)
{
    return;
}

(
function()
{
    var editIdRegex = /^edit-but-(\d+)$/;

    function createEditHandler(id)
    {
        return function(event)
        {
            return unsafeWindow.ajax_prep_for_edit(id, event);
        };
    }

    // Get a list of edit button links
    var nodes =
        document.evaluate(
        "//a[starts-with(@id,'edit-but-')]",
        document,
        null,
        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
        null);

    for (var i = 0; i < nodes.snapshotLength; i++)
    {
        var node = nodes.snapshotItem(i);
        node.addEventListener("click", createEditHandler(editIdRegex.exec(node.id)[1]), false);
    }
}
)();