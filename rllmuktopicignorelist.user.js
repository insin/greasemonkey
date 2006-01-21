// ==UserScript==
// @name        Rllmuk Topic Ignore List
// @namespace   http://insin.woaf.net/scripts/
// @description Implements a topic ignore list, sending selected topics to an unobtrusive ignore list or removing them completely.
// @include     http://www.rllmukforum.com/*
// ==/UserScript==

/* Changelog
 * ---------
 * 2005-06-12 Reduced MAX_COOKIE_SIZE to 4000, as setting cookies when close to
 *            the old 4096 limit seems to silently fail.
 * 2005-05-26 Functionally complete version finished, tidied up and commented.
 * -------------------------------------------------------------------------- */

(
/**
 * Implements a topic ignore list for http://www.rllmukforum.com - an Invision
 * Power Board 2.* based forum. As such, this shouldn't be too hard to tweak
 * for use on other forums which use the same software and default layout.
 * @author Jonathan Buchanan
 */
function()
{
    // Check for required Greasemonkey functions
    if (!GM_getValue || !GM_registerMenuCommand)
    {
        alert("'Rllmuk Topic Ignore List' requires Greasemonkey 0.3 or higher" +
              " - please upgrade\n\nhttp://greasemonkey.mozdev.org");
        return;
    }

    /* Configuration
     ------------------------------------------------------------------------ */

    // Determines if topics should be completely removed or added to a
    // toggleable ignore list below the main topic list
    var TIL_remove;
    var m = GM_getValue("remove");
    if (m == undefined) // Deal with first time run
    {
        GM_setValue("remove", false);
        TIL_remove = false;
    }
    else
    {
        TIL_remove = m;
    }

    // Name of the cookie used to store the topic numbers on the ignore list
    var TIL_cookieName = "TILTopicList";

    // Max cookie size constant
    var MAX_COOKIE_SIZE = 4000;

    /* Script Page Check
     ------------------------------------------------------------------------ */

    // Don't set up methods or do anything unless we're on a topic list page
    if (window.location.href.indexOf("showforum=") != -1
        || window.location.href.indexOf("act=SF") != -1
        || window.location.href.indexOf("searchid=") != -1)
    {

    /* Utility Methods
     ------------------------------------------------------------------------ */
    /**
     * Given a search term and an array, determines the search term's position
     * in the array.
     * @param searchTerm The term to search for.
     * @param array The array to search in.
     * @return The search term's position in the array, or -1 if not found.
     */
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
    }

    /**
     * Retrieves an array of topic numbers from a cookie with the same name as
     * the <code>TIL_cookieName</code> varible. Depends on the
     * <code>TIL_cookieName</code> variable having been set correctly.
     * @return An array of topic numbers; may be an empty array.
     */
    function getTopicList()
    {
        var t = [];
        for (var i = 0; i < document.cookie.split('; ').length; i++)
        {
            var oneCookie = document.cookie.split('; ')[i].split('=');
            if (oneCookie[0] == TIL_cookieName)
            {
                t = oneCookie[1].split(',');
            }
        }
        return t;
    }

    /**
     * Stores an array of topic numbers in a cookie named according to the
     * <code>TIL_cookieName</code> varible. Depends on the <code>TIL_cookieName</code>
     * variable having been set correctly.
     */
    function storeTopicList(t)
    {
        var date = new Date();
        var days = 365;
        date.setTime(date.getTime() + (days*24*60*60*1000));
        var expires = '; expires=' + date.toGMTString();
        var value = t.join(',');
        // If the list is longer than the max cookie size, trim the end
        while (value.length > MAX_COOKIE_SIZE)
        {
            value = value.substring(0, value.lastIndexOf(",") - 1);
        }
        document.cookie = TIL_cookieName + '=' + value + expires + '; path=/';
    }

    /**
     * Inserts a toggleable area into the current page to store ignored topics.
     * Depends on the <code>pageType</code> variable having been set correctly.
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
        postTable = postTable.nextSibling;
        while (postTable.nodeType != 1)
        {
            postTable = postTable.nextSibling;
        }
        postTable = postTable.nextSibling;
        while (postTable.nodeType != 1)
        {
            postTable = postTable.nextSibling;
        }
        // Search pages contain two extra <br> elements
        if (pageType == SEARCH_PAGE)
        {
            postTable = postTable.nextSibling;
            while (postTable.nodeType != 1)
            {
                postTable = postTable.nextSibling;
            }
            postTable = postTable.nextSibling;
            while (postTable.nodeType != 1)
            {
                postTable = postTable.nextSibling;
            }
        }
        // Create an element to contain the toggleable section
        area = document.createElement("DIV");
        area.innerHTML = toggleableSectionHTML;
        // Insert the toggleable section
        postTable.parentNode.insertBefore(area, postTable);
        // Indicate that the toggleable section has been inserted
        toggleableSectionInserted = true;
    }

    /* Initialisation
     ------------------------------------------------------------------------ */

    // Initialise topic number list
    var topics = getTopicList();

    // Page type field and constants
    var pageType;
    var FORUM_PAGE = 0;
    var SEARCH_PAGE = 1;

    // Toggleable section insertion status
    var toggleableSectionInserted = false;

    // Images
    var iconCross =
        '<img src="data:image/gif;base64,R0lGODlhCAAIAKECAIyMjKqqqp%2B' +
        'fn5%2BfnyH5BAEKAAIALAAAAAAIAAgAAAIQFIRmcXvAYFss0SmlQ3qqAgA7">';
    var iconPlus =
        '<img src="data:image/gif;base64,R0lGODlhCAAIAKECAIuLi6qqqp%2B' +
        'fn5%2BfnyH5BAEKAAIALAAAAAAIAAgAAAIQlBGmgntpgpwSWHRVc3v1AgA7">';

    // XPATH query for this page's topic links
    var xpathQuery;

    // Regular expression for extracting topic numbers
    var topicNumRegex = /showtopic=([0-9]+)/;

    // Initialise active topics list
    var activeTopics = [];

    /* Topic Management
     ------------------------------------------------------------------------ */

    // Set the correct xpath query and page type variable for this page
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

    // Go to work on the list of topic links
    for (var i = 0; i < nodes.snapshotLength; i++)
    {
        var node = nodes.snapshotItem(i);

        // Extract this topic's unique topic number from the link
        var topicNum = topicNumRegex.exec(node.href)[1];

        // Check if this topic number in our cookie list
        var arrayPos = positionInArray(topicNum, topics);
        var beingIgnored = (arrayPos != -1);

        // Move this topic's number to the head of the active list if found
        if (beingIgnored)
        {
            activeTopics.splice(0, 0, topics.splice(arrayPos, 1));
        }

        // Create clickable icon for topic management
        var a = document.createElement("SPAN");
        a.className = topicNum;
        a.style.cursor = "pointer";
        a.style.margin = "6px";
        if (beingIgnored)
        {
            a.innerHTML = iconPlus;
            a.title = "Click to stop ignoring this topic";
        }
        else
        {
            a.innerHTML = iconCross;
            a.title = "Click to ignore this topic";
        }
        a.onclick = function()
        {
            // Refresh the list of topics
            topics = getTopicList();

            // Toggle this topic out of the list if it's already there
            var topic = this.className;
            var notFound = true;
            for (var j = 0; j < topics.length; j++)
            {
                if (topics[j] == topic)
                {
                    topics.splice(j, 1);
                    notFound = false;
                }
            }

            // Otherwise, add this topic to the list and take appropriate action
            if (notFound)
            {
                // Add this topic's number to the front of the list
                topics.splice(0, 0, topic);
                var row = this.parentNode.parentNode;
                // Deal with this topic's row, as configured
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
                    // Update the topic management icon appropriately
                    this.innerHTML = iconPlus;
                    this.title = "Click to stop ignoring this topic";
                }
            }
            else
            {
                // Show that this topic won't be ignored on next page load
                this.innerHTML = iconCross;
                this.title = "Click to ignore this topic";
            }

            // Update the topic list cookie appropriately
            if (topics.length > 0)
            {
                // List is non-empty - store it in the cookie
                storeTopicList(topics);
            }
            else
            {
                // List is empty - clear the cookie
                document.cookie =
                    TIL_cookieName +
                    '=;expires=Thu, 01-Jan-1970 00:00:01 GMT; path=/';
            }
        };

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

        // Insert the clickable icon
        cell.appendChild(a);

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

    } // End Script Page Check

    /* Menu Commands
     ------------------------------------------------------------------------ */

    // Topic Removal Toggling menu command
    function TIL_toggleRemove()
    {
        // Flip the currently configure value
        GM_setValue("remove", !TIL_remove);
        // Reload the page
        window.location.reload();
    }
    // Register the menu command with an appropriate label
    if (TIL_remove)
    {
        GM_registerMenuCommand("Turn Topic Removal Off", TIL_toggleRemove);
    }
    else
    {
        GM_registerMenuCommand("Turn Topic Removal On", TIL_toggleRemove);
    }

    // Space Checking menu command
    function TIL_checkSpace()
    {
        for (i = 0; i < document.cookie.split('; ').length; i++)
        {
            c = document.cookie.split('; ')[i].split('=');
            if (c[0] == TIL_cookieName)
            {
                t = c[1];
                alert("You're using " +
                      Math.round((t.length/MAX_COOKIE_SIZE) * 100) +
                      "% of your Topic Ignore List space (" +
                      t.length +
                      "/" + MAX_COOKIE_SIZE + " bytes)\n\n" +
                      c[1].split(',').length +
                      " topics are being ignored");
                return;
            }
        }
        alert("You're not using any of your Topic Ignore List space (0 bytes)");
    }
    GM_registerMenuCommand("Show Topic Ignore List Space Usage",
                           TIL_checkSpace);
}
)();

/* Acknowledgements
 * ----------------
 * Cookie management based on phpBB User Hide
 * - http://s93731204.onlinehome.us/firefox/greasemonkey/phpbb.ignore.user.js
 * With plenty of help from Mark Pilgrim's excellent Dive Into Greasemonkey
 * - http://www.diveintogreasemonkey.org
 * -------------------------------------------------------------------------- */