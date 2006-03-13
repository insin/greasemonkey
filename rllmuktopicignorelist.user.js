// ==UserScript==
// @name        Rllmuk Topic Ignore List
// @namespace   http://www.jonathanbuchanan.plus.com/repos/greasemonkey/
// @description Implements a topic ignore list, sending selected topics to an unobtrusive Ignored Topics section at the foot of topic listing pages.
// @include     http://www.rllmukforum.com/*
// @include     http://rllmukforum.com/*
// ==/UserScript==

/* Changelog
 * ---------
 * 2006-03-13 Removed setting which toggled usage of the Ignored Topics section
 *            and did a general code tidy.
 * 2006-03-12 Changed method for getting topic's row to avoid dumping the entire
 *            post table in the Ignored Topics section.
 * 2006-03-10 Updated to work with latest version of Greasemonkey and removed
 *            all use of cookies in favour of GM's own storage mechanism.
 * 2005-06-12 Reduced MAX_COOKIE_SIZE to 4000, as setting cookies when close to
 *            the old 4096 limit seems to silently fail.
 * 2005-05-26 Functionally complete version finished, tidied up and commented.
 * -------------------------------------------------------------------------- */

// Don't attempt to apply topic ignoring unless we're on a topic list page
if (   window.location.href.indexOf("showforum=") == -1
    && window.location.href.indexOf("act=SF") == -1
    && window.location.href.indexOf("searchid=") == -1)
{
    return;
}

/* Rllmuk Topic Ignore List
----------------------------------------------------------------------------- */
(
function()
{
    var IGNORED_TOPIC_SETTING = "ignoredTopics";
    var IGNORED_TOPIC_SEPARATOR = ",";
    var FORUM_PAGE = 0;
    var SEARCH_PAGE = 1;

    var pageType;
    var topicLinkXPathQuery;
    var topicIdRegex = /showtopic=([0-9]+)/;
    var crossIcon =
        '<img src="data:image/gif;base64,R0lGODlhCAAIAKECAIyMjKqqqp%2B' +
        'fn5%2BfnyH5BAEKAAIALAAAAAAIAAgAAAIQFIRmcXvAYFss0SmlQ3qqAgA7">';
    var plusIcon =
        '<img src="data:image/gif;base64,R0lGODlhCAAIAKECAIuLi6qqqp%2B' +
        'fn5%2BfnyH5BAEKAAIALAAAAAAIAAgAAAIQlBGmgntpgpwSWHRVc3v1AgA7">';

    /**
     * Determines the position of a given item in a given Array using == to test
     * for equality.
     *
     * @param item the term to be searched for.
     * @param array the array to be searched for the search term.
     * @return the index of the search term in the array if found, -1 otherwise.
     */
    function positionInArray(item, array)
    {
        for(var i = 0; i < array.length; i++)
        {
            if (array[i] == item)
            {
                return i;
            }
        }
        return -1;
    };

    /**
     * Retrieves ignored topic ids.
     *
     * @return an Array of ids of topics which are currently being ignored.
     */
    function getIgnoredTopicIds()
    {
        var settings = GM_getValue(IGNORED_TOPIC_SETTING)
        return (settings ? settings.split(IGNORED_TOPIC_SEPARATOR) : []);
    };

    /**
     * Inserts an Ignored Topics section into the current page to store table
     * rows which contain ignored topic details.
     *
     * @param postTable the DOM Node for the table which holds topic listings,
     *                  to be used as a reference point for insertion of the new
     *                  section.
     */
    function insertIgnoredTopicsSection(postTable, pageType)
    {
        // The following HTML is a direct lift from the toggleable topic folder
        // sections of the forum - it uses the forum's own Javascript functions
        // to toggle its display.
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
  <table cellspacing="1" width="100%">\
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
    };

    /**
     * Creates an event handling Function for ignoring a topic.
     *
     * @param topicId the id of the topic to be ignored.
     * @return a Function which, when executed, will toggle the ignored state of
     *         the topic with the given id.
     */
    function createIgnoreHandler(topicId)
    {
        return function(event)
        {
            // Toggle this topic out of the list if it's already there
            var newlyIgnoredTopic = true;
            var ignoredTopicIds = getIgnoredTopicIds();
            var topicIdIndex = positionInArray(topicId, ignoredTopicIds);
            if (topicIdIndex > -1)
            {
                ignoredTopicIds.splice(topicIdIndex, 1);
                newlyIgnoredTopic = false;
            }

            var ignoreControl = event.target.parentNode;
            if (newlyIgnoredTopic)
            {
                // Add this topic's id to the front of the ignore list
                ignoredTopicIds.splice(0, 0, topicId);

                // Move the table row Node which contains this topic's details
                // to the Ignored Topics section.
                var row = ignoreControl;
                do
                {
                    row = row.parentNode;
                } while (row.nodeName.toLowerCase() != "tr")
                document.getElementById("TILInsertTarget").appendChild(row);

                // Update the topic ignoring control appropriately
                ignoreControl.innerHTML = plusIcon;
                ignoreControl.title = "Click to stop ignoring this topic";
            }
            else
            {
                // Show that this topic won't be ignored on next page load
                ignoreControl.innerHTML = crossIcon;
                ignoreControl.title = "Click to re-ignore this topic";
            }

            // Store the updated ignored topic list
            if (ignoredTopicIds.length > 0)
            {
                GM_setValue(IGNORED_TOPIC_SETTING, ignoredTopicIds.join(","));
            }
            else
            {
                GM_setValue(IGNORED_TOPIC_SETTING, undefined);
            }
        };
    };

    /* Page Load Topic Management and Ignore Control Setup
    ------------------------------------------------------------------------- */
    // Set the xpath query and page type indicator for this page
    if (window.location.href.indexOf("searchid=") > -1)
    {
        pageType = SEARCH_PAGE;
        topicLinkXPathQuery =
            "//div[@class='borderwrap']/table/tbody/tr/td[3]/table/tbody/tr/td[@width='100%']/a[1]";
    }
    else
    {
        pageType = FORUM_PAGE;
        topicLinkXPathQuery =
            "//table[@class='ipbtable']/tbody/tr/td[3]/div/span/a[starts-with(@title,'This topic was started')]";
    }

    var removedTopics = [];
    var ignoredTopicIds = getIgnoredTopicIds();
    var topicLinkNodes =
        document.evaluate(topicLinkXPathQuery, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0; i < topicLinkNodes.snapshotLength; i++)
    {
        var topicLinkNode = topicLinkNodes.snapshotItem(i);
        var topicId = topicIdRegex.exec(topicLinkNode.href)[1];
        var ignoredTopicIndex = positionInArray(topicId, ignoredTopicIds);
        var beingIgnored = (ignoredTopicIndex > -1);

        if (beingIgnored)
        {
            // Remove this topic's id from the current ignore list and place it
            // at the front of the removed topics list.
            removedTopics.splice(0, 0, ignoredTopicIds.splice(ignoredTopicIndex, 1));
        }

        // Create control for topic management
        var control = document.createElement("span");
        control.className = topicId;
        control.style.cursor = "pointer";
        control.style.margin = "6px";
        if (beingIgnored)
        {
            control.innerHTML = plusIcon;
            control.alt = "Unignore";
            control.title = "Click to stop ignoring this topic";
        }
        else
        {
            control.innerHTML = crossIcon;
            control.alt = "Ignore";
            control.title = "Click to ignore this topic";
        }
        control.addEventListener("click", createIgnoreHandler(topicId), false);

        // Find the table cell which will contain the ignore control
        var cell;
        if (pageType === SEARCH_PAGE)
        {
            cell = topicLinkNode.parentNode.parentNode.parentNode.parentNode.parentNode.previousSibling;
        }
        else if (pageType === FORUM_PAGE)
        {
            cell = topicLinkNode.parentNode.parentNode.parentNode.previousSibling;
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

        // Insert the Ignored Topics section on the first loop iteration
        if (i === 0)
        {
            var postTable = cell.parentNode.parentNode.parentNode.parentNode;
            insertIgnoredTopicsSection(postTable, pageType);
        }

        // If this topic is being ignored, move its row to the Ignored Topics
        // section.
        if (beingIgnored)
        {
            document.getElementById("TILInsertTarget").appendChild(cell.parentNode);
        }
    }

    // Place any active ignored  topics on the front of the ignored topic list
    // and store it.
    if (removedTopics.length > 0)
    {
        GM_setValue(IGNORED_TOPIC_SETTING,
                    removedTopics.concat(ignoredTopicIds).join(IGNORED_TOPIC_SEPARATOR));
    }
}
)();