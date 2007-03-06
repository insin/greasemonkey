// ==UserScript==
// @name        Rllmuk Topic Ignore List
// @namespace   http://www.jonathanbuchanan.plus.com/repos/greasemonkey/
// @description Implements a topic ignore list, sending selected topics to an unobtrusive Ignored Topics section at the foot of topic listing pages. For users who primarily browse the forum using View New Posts, topics may also be ignored on search result pages based on the folder they belong to.
// @include     http://www.rllmukforum.com/*
// @include     http://rllmukforum.com/*
// @include     http://www.rpsoft.co.uk/*
// @include     http://rpsoft.co.uk/*
// @include     http://www.extranoise.co.uk/*
// @include     http://extranoise.co.uk/*
// ==/UserScript==

/* Changelog
 * ---------
 * 2007-03-05 Forum software was updated, which broke the script.
 * 2007-02-20 Minor style update to remove multiple scrollbars when the window
 *            is smaller than the preferences dialogue.
 * 2007-02-19 No longer using User Script Commands menu - Script controls are
 *            now integrated into pages.
 * 2007-01-25 Added extranoise.co.uk domain.
 * 2006-11-02 Added GUI for configuration.
 *            Removed positionInArray function, now using JS 1.6's Array.indexOf
 * 2006-04-07 Added ignoring of specified folders on search pages and a menu
 *            item to edit the ignored folder list.
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
var IGNORED_TOPIC_SETTING = "ignoredTopics";
var IGNORED_FOLDER_SETTING = "ignoredFolders";
var IGNORED_ITEM_SEPARATOR = ",";
var FORUM_PAGE = 0;
var SEARCH_PAGE = 1;

var pageType = null;
var topicLinkXPathQuery = null;
var folderLinkXPathQuery = null;
var topicIdRegex = /who_posted\(([0-9]+)\)/;
var crossIcon =
    '<img src="data:image/gif;base64,R0lGODlhCAAIAKECAIyMjKqqqp%2B' +
    'fn5%2BfnyH5BAEKAAIALAAAAAAIAAgAAAIQFIRmcXvAYFss0SmlQ3qqAgA7">';
var plusIcon =
    '<img src="data:image/gif;base64,R0lGODlhCAAIAKECAIuLi6qqqp%2B' +
    'fn5%2BfnyH5BAEKAAIALAAAAAAIAAgAAAIQlBGmgntpgpwSWHRVc3v1AgA7">';

/**
 * Retrieves ignored topic ids.
 *
 * @return an Array of ids of topics which are currently being ignored.
 */
function getIgnoredTopicIds()
{
    var settings = GM_getValue(IGNORED_TOPIC_SETTING);
    return (settings ? settings.split(IGNORED_ITEM_SEPARATOR) : []);
};

/**
 * Retrieves folder names.
 *
 * @return an Array of names of folders which are currently being ignored.
 */
function getIgnoredFolderNames()
{
    var settings = GM_getValue(IGNORED_FOLDER_SETTING);
    return (settings ? settings.split(IGNORED_ITEM_SEPARATOR) : []);
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
        var topicIdIndex = ignoredTopicIds.indexOf(topicId);
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
            GM_setValue(IGNORED_TOPIC_SETTING, ignoredTopicIds.join(IGNORED_ITEM_SEPARATOR));
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
        "//div[@class='borderwrap']/table/tbody/tr/td[6]/a";
    folderLinkXPathQuery =
        "//div[@class='borderwrap']/table/tbody/tr/td[4]/span/a";
}
else
{
    pageType = FORUM_PAGE;
    topicLinkXPathQuery =
        "//div[@class='borderwrap']/table[@class='ipbtable']/tbody/tr/td[4]/a";
}

var removedTopics = [];
var ignoredTopicIds = getIgnoredTopicIds();
var topicLinkNodes =
    document.evaluate(topicLinkXPathQuery, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
for (var i = 0; i < topicLinkNodes.snapshotLength; i++)
{
    var topicLinkNode = topicLinkNodes.snapshotItem(i);
    var topicId = topicIdRegex.exec(topicLinkNode.href)[1];
    var ignoredTopicIndex = ignoredTopicIds.indexOf(topicId);
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
    var cell = topicLinkNode.parentNode.parentNode.getElementsByTagName("td")[1];

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
                removedTopics.concat(ignoredTopicIds).join(IGNORED_ITEM_SEPARATOR));
}

// Remove topics from ignored folders if we're on a search page
if (pageType == SEARCH_PAGE)
{
    var ignoredFolderNames = getIgnoredFolderNames();
    if (ignoredFolderNames.length > 0)
    {
        var folderLinkNodes =
            document.evaluate(folderLinkXPathQuery, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

        for (var i = 0; i < folderLinkNodes.snapshotLength; i++)
        {
            var folderLinkNode = folderLinkNodes.snapshotItem(i);
            if (ignoredFolderNames.indexOf(folderLinkNode.innerHTML) != -1)
            {
                var row = folderLinkNode.parentNode.parentNode.parentNode;
                document.getElementById("TILInsertTarget").appendChild(row);
            }
        }
    }
}

/* Menu Commands
------------------------------------------------------------------------- */
var PREFS_HTML = "data:text/html;charset=utf-8;base64,PCFET0NUWVBFIGh0bWwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDQuMDEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvVFIvaHRtbDQvc3RyaWN0LmR0ZCI%2BDQo8aHRtbCBsYW5nPSJlbiI%2BDQo8aGVhZD4NCiAgPHRpdGxlPlVzZXJzY3JpcHQgUHJlZmVyZW5jZXM8L3RpdGxlPg0KICA8bWV0YSBodHRwLWVxdWl2PSJDb250ZW50LVR5cGUiIGNvbnRlbnQ9InRleHQvaHRtbDsgY2hhcnNldD1VVEYtOCI%2BDQogIDxtZXRhIG5hbWU9IkF1dGhvciIgY29udGVudD0iSm9uYXRoYW4gQnVjaGFuYW4iPg0KICA8bWV0YSBuYW1lPSJDb3B5cmlnaHQiIGNvbnRlbnQ9IiZjb3B5OyAyMDA2LCBKb25hdGhhbiBCdWNoYW5hbiI%2BDQogIDxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI%2BDQogIGJvZHkgeyBtYXJnaW46MDsgcGFkZGluZzowOyBmb250LXNpemU6MTJweDsgZm9udC1mYW1pbHk6Ikx1Y2lkYSBHcmFuZGUiLCJCaXRzdHJlYW0gVmVyYSBTYW5zIixWZXJkYW5hLEFyaWFsLHNhbnMtc2VyaWY7IGNvbG9yOiMzMzM7IHdpZHRoOiA3MjBweDsgbWFyZ2luOiAwIGF1dG87fQ0KICAubW9kdWxlIHsgYm9yZGVyOiAxcHggc29saWQgI2NjYzsgbWFyZ2luLWJvdHRvbTogNXB4OyBiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmOyB9DQogIC5tb2R1bGUgaDIsIC5tb2R1bGUgY2FwdGlvbiB7IG1hcmdpbjogMDsgcGFkZGluZzogMnB4IDVweCAzcHggNXB4OyBmb250LXNpemU6IDExcHg7IHRleHQtYWxpZ246IGxlZnQ7IGZvbnQtd2VpZ2h0OiBib2xkOyBiYWNrZ3JvdW5kOiAjN0NBMEM3IHVybCgiZGF0YTppbWFnZS9naWY7YmFzZTY0LFIwbEdPRGxoRVFBZkFPWUFBTHpTNmJESjQ0JTJCdzBZR2x5cnZSNkxUTTVZaXF6bjZpeUlPbnk0Q2t5YUclMkIyNDJ1MEtLJTJCMjdqUDUzdWd4b2lxellhb3pKeTYySnE0MTN1Z3g0cXN6NSUyQjgyYVRBM0s3SDRvU255NSUyQjgycmJONXJuUTZLVEEzYWZDM3JMTDVKUzAxS25FMzdiTzVuJTJCa3laeTUySHloeUs3STRiTEs1TGpQNXJuUTU1VzAxS25EMzVlMjFYNmp5SzdINFpLeTA2dkc0WHlpeUl5dDBKU3oxTEhKNDR1c3pwZTExbnloeDdyUTU1ZTIxcEd4MDZmQjNvcXN6bjJpeDVLeDBwZTExYVMlMkYzSUtseXF6RzRLYkMzcHEzMXJ2UjZhekY0TFhNNVl5dTBLdkY0YlBLNDVtNDFxZkMzYnZTNkgyaHg2ekc0WUtteXJQSzVLekY0Wld6MUl5dXo1cTQxb2FwellDanlaS3kwcXJFMzdmTjVxckQ0SiUyQjcycEN3MFpHeTBvR215byUyQnYwYlRONWJYTjVabTQxNTI2Mkp5NjJZV296SVdwektyRDM0YW96YnJSNkklMkJ2MHJqTzVyak81NmZCM2FuRTRJU215N1BMNUxmTzVwJTJCNzJiYk41WWFwekh1aHhyZlA1bnlneDdmUDU2SzkyNCUyQncwckhKNHFYQTNZdXJ6MzZqeVl1c3p5SDVCQUFBQUFBQUxBQUFBQUFSQUI4QUFBZiUyRmdBQ0NnNFNGZ2dRRVRFUk1pSWhFQkdtUGpBUWJHemMzS0NpV21aWTNsUnNvYXcyamRpY25EYWVvcUhoc0RSb2hyN0FoV1ZseGN4cTRJYkJnUmdXJTJCWWIxaEJVWmd2c1ltSGxBZVNjaklIczhtSm5CUWNBRUJNOWJZMW52VzJkZ1hMUzBsTFJjbDVlUG00QmNYUlVFdlRraFI3ZTh2UVZGSUwwVklLbTVZSUNBcUFBclVnaVdnbGpOQ2RDenAwS1pEaDRVNk91Z1FJa1RpRWc0Y2ZuQ3dZQ0dqQlQ0Y05YTGtvSUFCZzVJb1RTcFllVElQZ3dvWk1teXBBRk5tQnBvVjVNU3NNR2JFaUFnUmZnSWRROFluR2FBUkpDaFZNb1FLRmFaS3hZaVJvRVRDa0JvclZ0VHdzUUlIRGg4JTJCY0dEOXFqWEZCeGt5VXBpVmN2YkQyaFF5cVQ2NDZKRWp4NVVlYzd1NHNKc2pyd3NCQXJnQUR2eEZRR0UxQXZRTWpoRmpnV1BITVk0Y2VkeDR5aEVLbUduUTJFRkJNNFVkZlNqOCUyQmJ6amdRSFRCbEklMkZXSzJhdFlFeWFDQ1lnVURiREIwSVZjeFVLVU1iQWdJTUNJTCUyRmZoTWNPSWJqdjU4QUdlQmxPZk1uQTZJN2o1NUFoSWpxMWE5YlNaQmdPM1llTEZnY0dIOUFQUG55NGYzQXNNR2VSQk1TSkhqQWFHSkRmaE1lSk80NG1MRGZRUjMlMkJFd1RZbndNT0JBSUFPdyUzRCUzRCIpIHRvcCBsZWZ0IHJlcGVhdC14OyBjb2xvcjogI2ZmZjsgYm9yZGVyLWJvdHRvbTogMDsgfQ0KDQogIC5mb3JtLXJvdyB7IG92ZXJmbG93OiBoaWRkZW47IHBhZGRpbmc6IDhweCAxMnB4OyBmb250LXNpemU6IDExcHg7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZWVlOyBib3JkZXItcmlnaHQ6IDFweCBzb2xpZCAjZWVlOyB9DQogIC5mb3JtLXJvdyBpbWcsIC5mb3JtLXJvdyBpbnB1dCB7IHZlcnRpY2FsLWFsaWduOiBtaWRkbGU7IH0NCiAgLmZvcm0tZmllbGQgeyBmbG9hdDogbGVmdDsgfQ0KICAuYWxpZ25lZCBsYWJlbCB7IHBhZGRpbmc6IDAgMWVtIDNweCAwOyBmbG9hdDogbGVmdDsgd2lkdGg6IDhlbTsgfQ0KICAuY2hlY2tib3gtcm93IGxhYmVsIHsgcGFkZGluZzogMDsgZmxvYXQ6IG5vbmU7IHdpZHRoOiBhdXRvOyB9DQogIC5zdWJtaXQtcm93IHsgcGFkZGluZzogOHB4IDEycHg7IHRleHQtYWxpZ246IHJpZ2h0OyBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2VlZTsgYm9yZGVyLXJpZ2h0OiAxcHggc29saWQgI2VlZTsgfQ0KDQogIHVsIHsgbWFyZ2luOiAwOyBwYWRkaW5nOiAwIDAgMCAxLjVlbTsgbGluZS1oZWlnaHQ6IDEuNWVtOyB9DQogIGxpIHsgbWFyZ2luOiAwOyBwYWRkaW5nOiAwOyB9DQoNCiAgc3Bhbi5jb250cm9sIHsgdGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7IGN1cnNvcjogcG9pbnRlcjsgY29sb3I6ICMwMGY7IH0NCg0KICAuc2VsZWN0b3IgeyB3aWR0aDo1ODBweDsgZmxvYXQ6bGVmdDsgfQ0KICAuc2VsZWN0b3Igc2VsZWN0IHsgd2lkdGg6MjcwcHg7IGhlaWdodDoxNy4yZW07IH0NCiAgLnNlbGVjdG9yLWF2YWlsYWJsZSwgLnNlbGVjdG9yLWNob3NlbiB7IGZsb2F0OmxlZnQ7IHdpZHRoOjI3MHB4OyB0ZXh0LWFsaWduOmNlbnRlcjsgbWFyZ2luLWJvdHRvbTo1cHg7IH0NCiAgLnNlbGVjdG9yLWF2YWlsYWJsZSBoMiwgLnNlbGVjdG9yLWNob3NlbiBoMiB7IGJvcmRlcjoxcHggc29saWQgI2NjYzsgfQ0KICAuc2VsZWN0b3IgLnNlbGVjdG9yLWF2YWlsYWJsZSBoMiB7IGJhY2tncm91bmQ6d2hpdGUgdXJsKCJkYXRhOmltYWdlL2dpZjtiYXNlNjQsUjBsR09EbGhFUUFmQU1RQUFQZjM5JTJCM3Q3ZWZuNSUyQnJxNnYzOSUyRmZyNiUyQnZEdzhQUHo4JTJGUHo4dVRrNVBIeDhlSGg0ZTd1N3Z2NyUyQiUyRmo0JTJCT2pvNlBYMTllTGk0dno4JTJGT3pzN1BuNSUyQmZiMjl1Ym01djclMkIlMkZ2JTJGJTJGJTJGd0FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUNINUJBQUFBQUFBTEFBQUFBQVJBQjhBQUFXT0lDYU9aR21lYUtxdWJPdTZWeXpQZEczWFJLN3ZmQzc5d0tEdzF5Z2FqOGhpWWNsc09wZVVxSFJLalRxdTJLejJDdWg2diUyQkJ1WlV3dW04ZVF0SHJOVGglMkZlOExqOGdGRFk3JTJGaTgzY0R2JTJCJTJGOThESUtEaElXQ0FZaUppb3VJRTQ2UGtKR09BNVNWbHBlVUQ1cWJuSjJhQXFDaG9xT2dGcWFucUttbUNheXRycSUyQnNFYkt6dExXeUM3aTV1cnU0SVFBNyIpIGJvdHRvbSBsZWZ0IHJlcGVhdC14OyBjb2xvcjojNjY2OyB9DQogIC5zZWxlY3RvciAuc2VsZWN0b3ItYXZhaWxhYmxlIGlucHV0IHsgd2lkdGg6MjMwcHg7IH0NCiAgLnNlbGVjdG9yIHVsLnNlbGVjdG9yLWNob29zZXIgeyBmbG9hdDpsZWZ0OyB3aWR0aDoyMnB4OyBoZWlnaHQ6NTBweDsgYmFja2dyb3VuZDp1cmwoImRhdGE6aW1hZ2UvZ2lmO2Jhc2U2NCxSMGxHT0RsaEZnQXZBTE1BQVA3JTJCJTJGdSUyRnY3JTJGSHg4ZjM5JTJGZmYzOSUyRlB6OCUyRmo0JTJCUEx5OHZEdzhQbjUlMkJmJTJGJTJGJTJGJTJCN3U3Z0FBQUFBQUFBQUFBQUFBQUNINUJBQUFBQUFBTEFBQUFBQVdBQzhBQUFSMFVNa0pUQkZyaVdMQSUyRkJRUlpDUVpFQjZvREVmcGtzY0FEc2hyTDRnOHRiZDlUSVJlajZBQWpJUzJBQ0NCN0ZtYXR3dlVoamhPcjlpc2RzdnRlciUyRmdzSGhNTHB2UDZMUjZiYlptQTVqdGhsdGdianZ1cVZJUnpCSWxjVk1DS1NzMVVEa3pQRUl4S2tVaU55ZUVqUlZTR2h5U0VoRUFPdyUzRCUzRCIpIHRvcCBjZW50ZXIgbm8tcmVwZWF0OyBtYXJnaW46OGVtIDNweCAwIDNweDsgcGFkZGluZzowOyB9DQogIC5zZWxlY3Rvci1jaG9vc2VyIGxpIHsgbWFyZ2luOjA7IHBhZGRpbmc6M3B4OyBsaXN0LXN0eWxlLXR5cGU6bm9uZTsgfQ0KICAuc2VsZWN0b3Igc2VsZWN0IHsgbWFyZ2luLWJvdHRvbTo1cHg7IG1hcmdpbi10b3A6MDsgfQ0KICAuc2VsZWN0b3ItYWRkLCAuc2VsZWN0b3ItcmVtb3ZlIHsgd2lkdGg6MTZweDsgaGVpZ2h0OjE2cHg7IGRpc3BsYXk6YmxvY2s7IHRleHQtaW5kZW50Oi0zMDAwcHg7IH0NCiAgLnNlbGVjdG9yLWFkZCB7IGN1cnNvcjogcG9pbnRlcjsgYmFja2dyb3VuZDp1cmwoImRhdGE6aW1hZ2UvZ2lmO2Jhc2U2NCxSMGxHT0RsaEVBQVFBT1paQUlhcHpZbXN6NCUyQnYwZHJrNyUyQmZ1OVphMDFhTzkxM3VneG9Xb3kzNml4N1RKMyUyQnJ3OSUyQkRwOHJqUDVvT215WnE1MTRDa3lmMyUyQiUyRnU3eiUyQkxQSTNvaXF6WTZ0enBPeTB1JTJGMCUyQktyQzJuJTJCanliN1E1WU9ueTVtMzFZQ2p5SSUyQnYwSDJpeCUyQkhxODVhMTFMbk40cU85MmFPJTJCMnAyNTFueWh4NEtseXBtNDE2VyUyRjI3Yk41SjY2MW4lMkJreWJMSzQlMkZQMiUyQm9LbXluMmh4NXE0MXZIMSUyQmJiSzMzNmp5Skd4MG82dTBPdnc5cmJONWFTJTJGMjRTb3pNTFU1OXptOFlxc3pwaTQxbnloeG8lMkJ3MFlDa3lwZTExSWVwek96eTk1JTJCODJPbnY5cUslMkIyNTY3MTdUTTVKV3oxTWZZNmFYQjNKS3gwMyUyQmp5TEhIM2JQTDQ1ZTIxWjI2Mkt6RzRKT3owNGVxemFYQTNJNnYwZlg0JTJCJTJGJTJGJTJGJTJGd0FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFDSDVCQUVBQUZrQUxBQUFBQUFRQUJBQUFBZTdnRm1DV1F3WURobEJIUVlEZzRNUkV3aEhTUTBOT0V3VVR4ZU5UeFl0VUolMkJnVUJ3JTJGRW9JS0hsT3BxU3FxVXlGUFdVUVFPVmExdFVaTHRsWUlBek0yVXNEQkJGZzd3UllHRlUwRkJTa0x6aTVZV0JyTFNnY0pBdGdqMGR2Ukl0Z3dDUUhpU056YlJlSW1GVG9BQUVJRTd6TFJKZXdBQndvdlZmbjZJRmdyJTJCaHNHYm55NFFyQWdEeElGcjdCZ3BBQUJsWWNQWTBDa2dtblFreUZSTW1yTTJPTkFLVUdQSUFEeDhlQUJpaG9uTWpVU1ZNZ0JEU2NKRmpVS0JBQTciKSB0b3AgY2VudGVyIG5vLXJlcGVhdDsgbWFyZ2luLWJvdHRvbToycHg7IH0NCiAgLnNlbGVjdG9yLXJlbW92ZSB7IGN1cnNvcjogcG9pbnRlcjsgYmFja2dyb3VuZDp1cmwoImRhdGE6aW1hZ2UvZ2lmO2Jhc2U2NCxSMGxHT0RsaEVBQVFBTlUlMkJBTUhCd2J5OHZQUHo4N1MwdExHeHNjN1czYTIxdmJDeHNzWEZ4YnU3dSUyQkRnNFBEdzhMSzd4Y3pNekxtNXVmejklMkZheXd0Ykt5c3VicTc5WGM0OFBEdzc2JTJCdnN2THk4ckt5dm41JTJCYks3eEs2d3NxJTJCM3Y5M2QzZWpzOE1MQ3d0cmEydDdlM3V2cjY4JTJGUHo3T3pzN084eHJhMnRzZkh4JTJGajQlMkJPM3Q3ZVRwN2ZIeDhjREF3SyUyQnhzdmIyOXRMUzB1TG02OWpZMk0zTnpiRzZ3N2k0dU52YjI4bkp5YzdPenJXMXRkWFYxY2pJeUxlM3Q4VEV4TCUyQiUyRnYlMkZYNCUyQiUyRiUyRiUyRiUyRndBQUFDSDVCQUVBQUQ0QUxBQUFBQUFRQUJBQUFBYXJRSiUyRlFOOWxvU2pxV29UQWNQaklPRVVlaEFMa1NzazVUUnFGNXYxNFRRU0prOEhCbzlDZU4yOGw4cVZ2TVJyY3BCSFg2ckVDcTVQNDVIRDBxZ0g4QUJoQThBSXN3UFQwbkFwRVhBQ3NFQndHWU9JNDlHSnM1bUJFSE02TUltNTJPQ0tNUkVBTTNyaFNPTFF1elBLNEVEQU02dWpxbEtMdTZOd1l2SXp6RnhSWWh4c1VEVEF3T085RFFPZEU3V0VNeUNUWGEyOW9WWTA0Wk54NFhEUTBXT3pwWlRVSkZHcTBIUzAxQkFEcyUzRCIpIHRvcCBjZW50ZXIgbm8tcmVwZWF0OyB9DQogIHNwYW4uc2VsZWN0b3ItY2xlYXJhbGwgeyBjdXJzb3I6IHBvaW50ZXI7IGRpc3BsYXk6YmxvY2s7IHdpZHRoOjZlbTsgdGV4dC1hbGlnbjpsZWZ0OyBtYXJnaW4tbGVmdDphdXRvOyBtYXJnaW4tcmlnaHQ6YXV0bzsgZm9udC13ZWlnaHQ6Ym9sZDsgY29sb3I6IzY2NjsgIHBhZGRpbmc6M3B4IDAgM3B4IDE4cHg7IH0NCiAgc3Bhbi5zZWxlY3Rvci1jbGVhcmFsbDpob3ZlciB7IGNvbG9yOiMwMzY7IH0NCiAgc3Bhbi5zZWxlY3Rvci1jbGVhcmFsbCB7IGJhY2tncm91bmQ6dXJsKCJkYXRhOmltYWdlL2dpZjtiYXNlNjQsUjBsR09EbGhFQUFRQU5Vc0FOWFYxY3ZMeTclMkIlMkZ2NnVycTZ5c3JMeTh2Tm5aMmRiVzF0N2UzcWFtcHJLeXNzVEV4S2lvcU1uSnlhcXFxckd4c2VUazVLNnVycm01dWM3T3pxbXBxYVdscGJPenM5SFIwZDNkM2UlMkZ2NyUyRmYzOSUyQmZuNTlyYTJ0alkyTSUyRlB6NzYlMkJ2dExTMHZiMjl0ZlgxOVRVMUxxNnV2THk4cnU3dTdhMnR1UGo0NmVucDhmSHglMkZqNCUyQlAlMkYlMkYlMkZ3QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQ0g1QkFFQUFDd0FMQUFBQUFBUUFCQUFBQWFBUUpad1NDd2FqMGdXcEVDaEZDRElsU3JTT0J3YUVkWEtxSklBdmlJRVFLSXFvZ2FCTktDRVNnOVFSTk5KSU9Cb1ZoajZ5VVJNUFVnYks0SWRGaFlQS1gwT0h4bUNLeU1EQXc2SVF5WVZLUVFJZ2lBcEtSVjhReWdKSjZNWElRYWpDWEJFS2dvcXJoNEdyR1ZGVWdRTEV4TUxCRnBJS0NZTURDYXFTY1RGUlVFQU93JTNEJTNEIikgbGVmdCBjZW50ZXIgbm8tcmVwZWF0OyB9DQogIDwvc3R5bGU%2BDQogIDxzY3JpcHQgdHlwZT0idGV4dC9qYXZhc2NyaXB0Ij4NCiAgdmFyIFNlbGVjdHMgPQ0KICB7DQogICAgICBtb3ZlU2VsZWN0ZWRPcHRpb25zOiBmdW5jdGlvbihmcm9tLCB0bykNCiAgICAgIHsNCiAgICAgICAgICB2YXIgZnJvbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGZyb20pDQogICAgICAgICAgdmFyIHRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodG8pOw0KICAgICAgICAgIHZhciBvcHRpb247DQoNCiAgICAgICAgICBmb3IgKHZhciBpID0gZnJvbS5vcHRpb25zLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKQ0KICAgICAgICAgIHsNCiAgICAgICAgICAgICAgb3B0aW9uID0gZnJvbS5vcHRpb25zW2ldOw0KICAgICAgICAgICAgICBpZiAob3B0aW9uLnNlbGVjdGVkID09IHRydWUpDQogICAgICAgICAgICAgIHsNCiAgICAgICAgICAgICAgICAgIHRvLmFwcGVuZENoaWxkKG9wdGlvbik7DQogICAgICAgICAgICAgIH0NCiAgICAgICAgICB9DQogICAgICB9LA0KDQogICAgICBtb3ZlQWxsT3B0aW9uczogZnVuY3Rpb24oZnJvbSwgdG8pDQogICAgICB7DQogICAgICAgICAgdmFyIGZyb20gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChmcm9tKTsNCiAgICAgICAgICB2YXIgdG8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0byk7DQogICAgICAgICAgdmFyIG9wdGlvbjsNCg0KICAgICAgICAgIGZvciAodmFyIGkgPSBmcm9tLm9wdGlvbnMubGVuZ3RoIC0gMTsgaSA%2BPSAwOyBpLS0pDQogICAgICAgICAgew0KICAgICAgICAgICAgICBvcHRpb24gPSBmcm9tLm9wdGlvbnNbaV07DQogICAgICAgICAgICAgIHRvLmFwcGVuZENoaWxkKG9wdGlvbik7DQogICAgICAgICAgfQ0KICAgICAgfQ0KICB9Ow0KICA8L3NjcmlwdD4NCjwvaGVhZD4NCjxib2R5Pg0KDQo8Zm9ybSBuYW1lPSJwcmVmZXJlbmNlcyIgaWQ9InByZWZlcmVuY2VzIiBjbGFzcz0iYWxpZ25lZCI%2BDQogIDxkaXYgY2xhc3M9Im1vZHVsZSI%2BDQogICAgPGgyPlRvcGljIElnbm9yZSBMaXN0IFByZWZlcmVuY2VzPC9oMj4NCiAgICA8ZGl2IGNsYXNzPSJmb3JtLXJvdyI%2BDQogICAgICA8bGFiZWw%2BRm9sZGVyczo8L2xhYmVsPg0KICAgICAgPGRpdiBjbGFzcz0ic2VsZWN0b3IiPg0KICAgICAgICA8ZGl2IGNsYXNzPSJzZWxlY3Rvci1hdmFpbGFibGUiPg0KICAgICAgICAgIDxoMj5BdmFpbGFibGUgRm9sZGVyczwvaDI%2BDQogICAgICAgICAgPHNlbGVjdCBpZD0iYWxsX2ZvbGRlcnMiIGNsYXNzPSJmaWx0ZXJlZCIgbmFtZT0iYWxsX2ZvbGRlcnMiIHNpemU9IjE1IiBtdWx0aXBsZT0ibXVsdGlwbGUiPg0KICAgICAgICAgIDwvc2VsZWN0Pg0KICAgICAgICA8L2Rpdj4NCg0KICAgICAgICA8dWwgY2xhc3M9InNlbGVjdG9yLWNob29zZXIiPg0KICAgICAgICAgIDxsaT48c3BhbiBjbGFzcz0ic2VsZWN0b3ItYWRkIiBvbmNsaWNrPSdTZWxlY3RzLm1vdmVTZWxlY3RlZE9wdGlvbnMoImFsbF9mb2xkZXJzIiwiaWdub3JlZF9mb2xkZXJzIik7Jz5BZGQ8L3NwYW4%2BPC9saT4NCiAgICAgICAgICA8bGk%2BPHNwYW4gY2xhc3M9InNlbGVjdG9yLXJlbW92ZSIgb25jbGljaz0nU2VsZWN0cy5tb3ZlU2VsZWN0ZWRPcHRpb25zKCJpZ25vcmVkX2ZvbGRlcnMiLCJhbGxfZm9sZGVycyIpOyc%2BUmVtb3ZlPC9zcGFuPjwvbGk%2BDQogICAgICAgIDwvdWw%2BDQoNCiAgICAgICAgPGRpdiBjbGFzcz0ic2VsZWN0b3ItY2hvc2VuIj4NCiAgICAgICAgICA8aDI%2BSWdub3JlZCBGb2xkZXJzPC9oMj4NCiAgICAgICAgICA8c2VsZWN0IGNsYXNzPSJmaWx0ZXJlZCIgbmFtZT0iaWdub3JlZF9mb2xkZXJzIiBzaXplPSIxNSIgbXVsdGlwbGU9Im11bHRpcGxlIiBpZD0iaWdub3JlZF9mb2xkZXJzIj4NCiAgICAgICAgICA8L3NlbGVjdD4NCiAgICAgICAgICA8c3BhbiBjbGFzcz0ic2VsZWN0b3ItY2xlYXJhbGwiIG9uY2xpY2s9J1NlbGVjdHMubW92ZUFsbE9wdGlvbnMoImlnbm9yZWRfZm9sZGVycyIsICJhbGxfZm9sZGVycyIpOyc%2BQ2xlYXIgYWxsPC9zcGFuPg0KICAgICAgICA8L2Rpdj4NCiAgICAgIDwvZGl2Pg0KICAgIDwvZGl2Pg0KICA8L2Rpdj4NCg0KICA8ZGl2IGNsYXNzPSJtb2R1bGUiPg0KICAgIDxkaXYgY2xhc3M9InN1Ym1pdC1yb3ciPg0KICAgICAgPGlucHV0IHR5cGU9ImJ1dHRvbiIgdmFsdWU9IkNsb3NlIiBuYW1lPSJjbG9zZV9idXR0b24iIGlkPSJjbG9zZV9idXR0b24iPg0KICAgICAgPGlucHV0IHR5cGU9ImJ1dHRvbiIgdmFsdWU9IlNhdmUgUHJlZmVyZW5jZXMiIG5hbWU9InNhdmVfYnV0dG9uIiBpZD0ic2F2ZV9idXR0b24iPg0KICAgIDwvZGl2Pg0KICA8L2Rpdj4NCjwvZm9ybT4NCg0KPC9ib2R5Pg0KPC9odG1sPg%3D%3D";

function createLinkControl(name, handler)
{
    var a = document.createElement("a");
    a.href = "#";
    a.appendChild(document.createTextNode(name));
    a.addEventListener("click", handler, false);
    return a;
}

var controls =
    document.getElementById("userlinks").getElementsByTagName("p")[1];

controls.insertBefore(document.createTextNode(" . "), controls.firstChild);
controls.insertBefore(createLinkControl("Topic Ignore List", function()
{
    var folderNameRegex = /-- (.+)$/;
    var folderSelect = document.forms.namedItem("jumpmenu").elements.namedItem("f");
    var folders = [];
    for (var i = 0; i < folderSelect.options.length; i++)
    {
        var matches = folderSelect.options[i].text.match(folderNameRegex);
        if (matches != null)
        {
            folders.push(matches[1]);
        }
    }
    folders.sort();
    var ignoredFolders = getIgnoredFolderNames();

    var blocker = document.createElement("div");
    blocker.id = "uil_blocker";
    blocker.style.position = "fixed";
    blocker.style.top = "0px";
    blocker.style.right = "0px";
    blocker.style.bottom = "0px";
    blocker.style.left = "0px";
    blocker.style.backgroundColor = "#000";
    blocker.style.opacity = "0.5";
    document.body.appendChild(blocker);

    var prefs = document.createElement("iframe");

    prefs.addEventListener("load", function()
    {
        var document = prefs.contentDocument;
        var form = document.forms.namedItem("preferences");
        if (form)
        {
            folders.forEach(function(folderName)
            {
                var option = document.createElement("option");
                option.text = folderName;
                if (ignoredFolders.indexOf(folderName) > -1)
                {
                    form.elements.namedItem("ignored_folders").appendChild(option);
                }
                else
                {
                    form.elements.namedItem("all_folders").appendChild(option);
                }
            });
            form.elements.namedItem("close_button").addEventListener("click", function()
            {
                unsafeWindow.top.document.body.removeChild(prefs);
                unsafeWindow.top.document.body.removeChild(blocker);
            }, false);
            form.elements.namedItem("save_button").addEventListener("click", function()
            {
                var ignoredFolders = [];
                var select = this.form.elements.ignored_folders;
                for (var i = 0; i < select.options.length; i++)
                {
                    ignoredFolders.push(select.options[i].text);
                }

                if (ignoredFolders.length > 0)
                {
                    GM_setValue(IGNORED_FOLDER_SETTING, ignoredFolders.join(IGNORED_ITEM_SEPARATOR));
                }
                else
                {
                    GM_setValue(IGNORED_FOLDER_SETTING, undefined);
                }
                unsafeWindow.top.document.body.removeChild(prefs);
                unsafeWindow.top.document.body.removeChild(blocker);
            }, false);
        }
    }, false);

    document.body.appendChild(prefs);

    prefs.id = "til_preferences";
    prefs.name = "til_preferences";
    prefs.style.position = "fixed";
    prefs.style.top = "1em";
    prefs.style.left = "0px";
    prefs.style.right = "0px";
    prefs.style.border = "none";
    prefs.style.height = "100%";
    prefs.style.overflow = "hidden";
    prefs.src = PREFS_HTML;
}), controls.firstChild);