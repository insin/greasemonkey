// ==UserScript==
// @name        Rllmuk Topic Ignore List
// @namespace   http://insin.woaf.net/scripts/
// @description Implements a topic ignore list, sending selected topics to an unobtrusive ignore list or removing them completely.
// @include     http://www.rllmukforum.com/*
// ==/UserScript==

/* Changelog
 * ---------
 * 2006-03-09 Updated to work with latest version of Greasemonkey and removed
 *            all use of cookies in favour of GM's own storage mechanism.
 * 2005-06-12 Reduced MAX_COOKIE_SIZE to 4000, as setting cookies when close to
 *            the old 4096 limit seems to silently fail.
 * 2005-05-26 Functionally complete version finished, tidied up and commented.
 * -------------------------------------------------------------------------- */

(
function()
{
    // Check for required Greasemonkey functions
    if (!GM_getValue || !GM_registerMenuCommand)
    {
        alert("'Rllmuk Topic Ignore List' is not compatible with the installed version of Greasemonkey");
        return;
    }

    /* Configuration
    ------------------------------------------------------------------------- */
    // Determines if topics should be completely removed or added to a
    // toggleable ignore list below the main topic list
    var TIL_remove = GM_getValue("remove");
    if (TIL_remove === undefined)
    {
        GM_setValue("remove", false);
        TIL_remove = false;
    }

// Don't attempt to apply topic ignoring unless we're on a topic list page
if (   window.location.href.indexOf("showforum=") != -1
    || window.location.href.indexOf("act=SF") != -1
    || window.location.href.indexOf("searchid=") != -1)
{
    /* Utility Functions
    ------------------------------------------------------------------------- */
    function positionInArray(searchTerm, array)
    {
        for(var i = 0; i < array.length; i++)
        {
            if (array[i] == searchTerm)
            {
                return i;
            }
        }
        return -1;
    };

    function getTopicList()
    {
        var store = GM_getValue("ignoredTopics")
        var list = store ? store.split(",") : [];
        return list;
    };

    /**
     * Inserts a toggleable area into the current page to store ignored topics.
     * Depends on the <code>pageType</code> variable having been set correctly.
     *
     * @param postTable A DOM object representing the table which holds topic
     *                  listings.
     */
    function insertToggleableSection(postTable)
    {
        // The following HTML is a direct lift from the toggleable topic folder
        // sections of the forum - it uses the forum's own Javascript functions
        // to toggle display of ignored topics
        var toggleableSectionHTML =
'<div class="borderwrap" style="margin-bottom: 10px;" id="fc_99">\
  <div class="maintitlecollapse">\
    <p class="expand"><a href="javascript:togglecategory(99, 0);"><img src="style_images/1/exp_plus.gif" alt="Expand" border="0"></a></p>\
    <p><img src="style_images/1/nav_m.gif" alt="&gt;" border="0" height="8" width="8">&nbsp;<a href="#fc_99">Ignored Topics</a></p>\
  </div>\
</div>\
<div class="borderwrap" style="display: none; margin-bottom: 10px;" id="fo_99">\
  <div class="maintitle">\
    <p class="expand"><a href="javascript:togglecategory(99, 1);"><img src="style_images/1/exp_minus.gif" alt="Collapse" border="0"></a></p>\
    <p><img src="style_images/1/nav_m.gif" alt="&gt;" border="0" height="8" width="8">&nbsp;<a href="#fo_99">Ignored Topics</a></p>\
  </div>\
  <table cellspacing="1">\
  <tbody id="TILInsertTarget">\
  <tr> \
    <th align="center">&nbsp;</th>\
    <th align="center">&nbsp;</th>\
    <th nowrap="nowrap">Topic Title</th>';
    // Search page topic lists have an extra column
    if (pageType == SEARCH_PAGE)
    {
        toggleableSectionHTML += '<th align="center" nowrap="nowrap">Forum</th>';
    }
    toggleableSectionHTML +=
'    <th align="center" nowrap="nowrap">Replies</th>\
    <th align="center" nowrap="nowrap">Topic Starter</th>\
    <th align="center" nowrap="nowrap">Views</th>\
    <th nowrap="nowrap" width="22%">Last Action</th>\
  </tr>\
  </tbody>\
  </table>\
</div>';

        // Move one element past where we want to insert the toggleable section
        for (var i = 0; i < 2; i++)
        {
            postTable = postTable.nextSibling;
            while (postTable.nodeType != 1)
            {
                postTable = postTable.nextSibling;
            }
        }
        // Search pages contain two extra <br> elements
        if (pageType == SEARCH_PAGE)
        {
            for (var i = 0; i < 2; i++)
            {
                postTable = postTable.nextSibling;
                while (postTable.nodeType != 1)
                {
                    postTable = postTable.nextSibling;
                }
            }
        }

        area = document.createElement("div");
        area.innerHTML = toggleableSectionHTML;
        postTable.parentNode.insertBefore(area, postTable);
        toggleableSectionInserted = true;
    };

    function createIgnoreHandler(topicId)
    {
        return function(event)
        {
            var control = event.target;
            var topics = getTopicList();

            // Toggle this topic out of the list if it's already there
            var notFound = true;
            for (var j = 0; j < topics.length; j++)
            {
                if (topics[j] == topicId)
                {
                    topics.splice(j, 1);
                    notFound = false;
                }
            }

            // Otherwise, add this topic to the list and take appropriate action
            if (notFound)
            {
                // Add this topic's id to the front of the list
                topics.splice(0, 0, topicId);
                var row = control.parentNode.parentNode;
                if (TIL_remove)
                {
                    // Remove the row completely
                    row.parentNode.removeChild(row);
                }
                else
                {
                    // Move the row to the Ignored Topics section
                    var tbody = row.parentNode;
                    tbody.removeChild(row);
                    document.getElementById("TILInsertTarget").appendChild(row);
                    control.innerHTML = iconPlus;
                    control.title = "Click to stop ignoring this topic";
                }
            }
            else
            {
                // Show that this topic won't be ignored on next page load
                control.innerHTML = iconCross;
                control.title = "Click to re-ignore this topic";
            }

            // Update the stored topic list appropriately
            if (topics.length > 0)
            {
                GM_setValue("ignoredTopics", topics.join(","));
            }
            else
            {
                GM_setValue("ignoredTopics", undefined);
            }
        };
    };

    /* Initialisation
    ------------------------------------------------------------------------- */
    var topics = getTopicList();

    /** Page type indicator. */
    var pageType;
    var FORUM_PAGE = 0;
    var SEARCH_PAGE = 1;

    /** Toggleable section insertion status. */
    var toggleableSectionInserted = false;

    // Images
    var iconCross =
        '<img src="data:image/gif;base64,R0lGODlhCAAIAKECAIyMjKqqqp%2B' +
        'fn5%2BfnyH5BAEKAAIALAAAAAAIAAgAAAIQFIRmcXvAYFss0SmlQ3qqAgA7">';
    var iconPlus =
        '<img src="data:image/gif;base64,R0lGODlhCAAIAKECAIuLi6qqqp%2B' +
        'fn5%2BfnyH5BAEKAAIALAAAAAAIAAgAAAIQlBGmgntpgpwSWHRVc3v1AgA7">';

    /** XPATH query for this page's topic links. */
    var xpathQuery;

    /** Regular expression for extracting topic ids. */
    var topicIdRegex = /showtopic=([0-9]+)/;

    /** Active topics list. */
    var activeTopics = [];

    /* Topic Management
    ------------------------------------------------------------------------- */
    // Set the xpath query and page type indicator for this page
    if (window.location.href.indexOf("searchid=") != -1)
    {
        pageType = SEARCH_PAGE;
        xpathQuery =
            "//div[@class='borderwrap']/table/tbody/tr/td[3]/table/tbody/tr/td[@width='100%']/a[1]";
    }
    else
    {
        pageType = FORUM_PAGE;
        xpathQuery =
            "//table/tbody/tr/td[3]/div/a[starts-with(@title,'This topic was started')]";
    }

    // Get a list of topic links
    var nodes = document.evaluate(
                    xpathQuery,
                    document,
                    null,
                    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                    null);

    // Work on the list of topic links
    for (var i = 0; i < nodes.snapshotLength; i++)
    {
        var node = nodes.snapshotItem(i);
        var topicId = topicIdRegex.exec(node.href)[1];

        // Check if this topic number in our list
        var arrayPos = positionInArray(topicId, topics);
        var beingIgnored = (arrayPos != -1);

        // Move this topic's id to the head of the active list if found
        if (beingIgnored)
        {
            activeTopics.splice(0, 0, topics.splice(arrayPos, 1));
        }

        // Create control for topic management
        var control = document.createElement("span");
        control.className = topicId;
        control.style.cursor = "pointer";
        control.style.margin = "6px";
        if (beingIgnored)
        {
            control.innerHTML = iconPlus;
            control.alt = "Unignore";
            control.title = "Click to stop ignoring this topic";
        }
        else
        {
            control.innerHTML = iconCross;
            control.alt = "Ignore";
            control.title = "Click to ignore this topic";
        }
        control.addEventHandler("click", createClickHandler(topicId), true);

        // Find the table cell which will contain the clickable icon
        var cell;
        if (pageType == SEARCH_PAGE)
        {
            cell =
                node.parentNode.parentNode.parentNode.parentNode.parentNode.previousSibling;
        }
        else if (pageType == FORUM_PAGE)
        {
            cell = node.parentNode.parentNode.previousSibling;
        }
        // Skip over any empty text nodes
        while (cell.nodeType != 1)
        {
            cell = cell.previousSibling;
        }
        // Remove existing child nodes
        while (cell.childNodes.length > 0)
        {
            cell.removeChild(cell.firstChild);
        }

        // Insert the control
        cell.appendChild(control);

        // Insert the toggleable section on the first loop iteration
        if (!toggleableSectionInserted && !TIL_remove)
        {
            insertToggleableSection(
                cell.parentNode.parentNode.parentNode.parentNode);
        }

        // If this topic is being ignored, take the appropriate action
        if (beingIgnored)
        {
            // Deal with this topic's row, as configured
            var row = cell.parentNode;
            if (TIL_remove)
            {
                // Remove the row completely
                row.parentNode.removeChild(row);
            }
            else
            {
                // Move the row to the Ignored Topics section
                var tbody = row.parentNode;
                tbody.removeChild(row);
                document.getElementById("TILInsertTarget").appendChild(row);
            }
        }
    }

    // Promote any active topics to the head of the topic list and store it
    if (activeTopics.length > 0)
    {
        storeTopicList(activeTopics.concat(topics));
    }
}

    /* Menu Commands
    ------------------------------------------------------------------------- */
    // Topic Removal Toggling menu command
    var toggleTo = TIL_remove ? "Off" : "On";
    GM_registerMenuCommand("Turn Topic Removal " + toggleTo, function()
    {
        GM_setValue("remove", !TIL_remove);
        window.location.reload();
    });
}
)();