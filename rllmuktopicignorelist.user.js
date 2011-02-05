// ==UserScript==
// @name        Rllmuk Topic Ignore List
// @namespace   http://www.jonathanbuchanan.plus.com/repos/greasemonkey/
// @description Implements a topic ignore list, sending selected topics to an unobtrusive Ignored Topics section at the foot of topic listing pages. For users who primarily browse the forum using View New Posts, topics may also be ignored on search result pages based on the folder they belong to.
// @include     http://www.rllmukforum.com/*
// @include     http://rllmukforum.com/*
// ==/UserScript==

/* Changelog
 * ---------
 * 2010-08-12 Added an id to the Ignored Topics wrapper for styling.
 * 2010-08-06 Maintained topic striping when topics are moved around.
 * 2010-08-05 Restyled to fit in with default forum theme.
 * 2010-07-29 Sorted ignored foldernames; reduced whitespace around icons.
 * 2010-07-28 Added "Collapse Ignored Topics section by default" setting
 * 2010-07-27 Tweaks after testing on updated forum.
 * 2010-07-07 Updated script for impending move to IPB3.
 * 2010-06-17 Now usable as a library in a Chrome extension.
 * 2010-06-16 Refactored into main logic, config and UI modules.
 * 2009-07-14 Fixed error saving ignored folders in latest version.
 * 2008-09-13 Fixed preferences display issue in Firefox 3.
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

var isGM = !(typeof GM_getValue == "undefined" || GM_getValue("a", "b") == undefined);

/**
 * If we're running on a content page, this variable will point at an object
 * containing settings retrieved from the extension's localStorage, otherwise
 * we're running in the extension's context and want to access localStorage
 * directly.
 *
 * This allows us to include this script for use as a library in extension
 * contexts, such as in the preferences dialogue.
 */
var cachedSettings = null;

/**
 * Cached folder names for use in the preferences dialogue. For the chrome
 * extension, the initialising script will send these names to the background
 * page, where the preferences dialogue can retrieve them to populate this
 * variable.
 */
var folderNames = null;

if (!isGM)
{
    GM_getValue = function(name, defaultValue)
    {
        var value = (cachedSettings == null ? localStorage.getItem(name) : cachedSettings[name]);
        if (!value)
        {
            return defaultValue;
        }
        var type = value[0];
        value = value.substring(1);
        switch (type)
        {
            case "b":
                return (value == "true");
            case "n":
                return Number(value);
            default:
                return value;
        }
    }

    GM_setValue = function(name, value)
    {
        value = (typeof value)[0] + value;
        if (cachedSettings == null)
        {
            localStorage.setItem(name, value);
        }
        else
        {
            cachedSettings[name] = value;
            chrome.extension.sendRequest({type: "setpref", name: name, value: value});
        }
    }

    if (typeof(unsafeWindow) == "undefined")
    {
        unsafeWindow = window;
    }
}

Function.prototype.bind = function(object)
{
    var __method = this;
    return function()
    {
        __method.apply(object, arguments);
    }
};

/**
 * Processing of the current page.
 */
var TIL =
{
    pageType: null,
    topicIdRegExp: /showtopic=([0-9]+)/,
    crossIconDataURI: "data:image/gif;base64,R0lGODlhCAAIAKECAIyMjKqqqp%2Bfn5%2BfnyH5BAEKAAIALAAAAAAIAAgAAAIQFIRmcXvAYFss0SmlQ3qqAgA7",
    plusIconDataURI: "data:image/gif;base64,R0lGODlhCAAIAKECAIuLi6qqqp%2Bfn5%2BfnyH5BAEKAAIALAAAAAAIAAgAAAIQlBGmgntpgpwSWHRVc3v1AgA7",

    init: function()
    {
        this.pageType = this.determineCurrentPageType();
        if (this.pageType != null)
        {
            this.processPage();
        }
        this.registerControls();
    },

    determineCurrentPageType: function()
    {
        var pageType = null;
        if (window.location.href.indexOf("module=search") != -1)
        {
            pageType = "search";
        }
        else if (window.location.href.indexOf("/index.php?showforum=") != -1)
        {
            pageType = "topicListing";
        }
        return pageType;
    },

    getTopicLinkXPath: function()
    {
        return (this.pageType == "search"
            ? "//table[@id='forum_table']/tbody/tr/td[2]/a[@title='View result']"
            : "//table[@id='forum_table']/tbody/tr/td[2]/a[@class='topic_title']");
    },

    processPage: function()
    {
        var removedTopics = [];
        var ignoredTopicIds = TIL.Config.getIgnoredTopicIds();
        var topicLinkNodes =
            document.evaluate(
                this.getTopicLinkXPath(),
                document,
                null,
                XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                null);

        for (var i = 0; i < topicLinkNodes.snapshotLength; i++)
        {
            var topicLinkNode = topicLinkNodes.snapshotItem(i);
            var topicId = this.topicIdRegExp.exec(topicLinkNode.href)[1];
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
            if (beingIgnored)
            {
                control.innerHTML = '<img src="' + this.plusIconDataURI + '"> ';
            }
            else
            {
                control.innerHTML = '<img src="' + this.crossIconDataURI + '">&nbsp;&nbsp;&nbsp;';
            }
            control = control.firstChild;
            control.style.cursor = "pointer";
            if (beingIgnored)
            {
                control.alt = "Unignore";
                control.title = "Click to stop ignoring this topic";
            }
            else
            {
                control.alt = "Ignore";
                control.title = "Click to ignore this topic";
            }
            control.addEventListener("click", this.createIgnoreHandler(topicId), false);

            // Find the table cell which will contain the ignore control
            var cell = topicLinkNode.parentNode.parentNode.getElementsByTagName("td")[0];

            // Insert the control
            cell.appendChild(document.createTextNode(" "));
            cell.appendChild(control);

            // Insert the Ignored Topics section on the first loop iteration
            if (i === 0)
            {
                var postTable = cell.parentNode.parentNode.parentNode.parentNode;
                this.insertIgnoredTopicsSection(postTable);
            }

            // If this topic is being ignored, move its row to the Ignored Topics
            // section.
            if (beingIgnored)
            {
                document.getElementById("TILInsertTarget").appendChild(cell.parentNode);
            }
        }

        // Place any active ignored topics on the front of the ignored topic list
        // and store it.
        if (removedTopics.length > 0)
        {
            TIL.Config.setIgnoredTopicIds(
                removedTopics.concat(ignoredTopicIds));
        }

        // Remove topics from ignored folders if we're on a search page
        if (this.pageType == "search")
        {
            var ignoredFolderNames = TIL.Config.getIgnoredFolderNames();
            if (ignoredFolderNames.length > 0)
            {
                var folderLinkNodes =
                    document.evaluate(
                        "//table[@id='forum_table']/tbody/tr/td[3]/a",
                        document,
                        null,
                        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                        null);
                for (var i = 0; i < folderLinkNodes.snapshotLength; i++)
                {
                    var folderLinkNode = folderLinkNodes.snapshotItem(i);
                    if (ignoredFolderNames.indexOf(folderLinkNode.innerHTML) != -1)
                    {
                        var row = folderLinkNode.parentNode.parentNode;
                        document.getElementById("TILInsertTarget").appendChild(row);
                    }
                }
            }
        }

        this.fixTopicStriping();
    },

    /**
     * Inserts an Ignored Topics section into the current page to store table
     * rows which contain ignored topic details.
     *
     * @param postTable the DOM Node for the table which holds topic listings,
     *                  to be used as a reference point for insertion of the new
     *                  section.
     */
    insertIgnoredTopicsSection: function(postTable)
    {
        var collapse = TIL.Config.getCollapseIgnoredTopics();
        var toggleableSectionHTML =
'<div class="category_block block_wrap" id="TILIgnoredTopicsWrap">\
<h3 class="maintitle' + (collapse ? ' collapsed' : '') + '" id="category_ignoredtopics" style="overflow: visible !important"><a href="#" class="toggle right" id="toggle_ignored_topics">Toggle ignored topics</a> Ignored Topics</h3>\
<div class="table_wrap" id="ignored_topics" style="overflow: visible;' + (collapse ? ' display: none;' : '') + '">\
<table summary="Ignored Topics" class="ipb_table">\
<tbody id="TILInsertTarget">\
<tr class="header">\
<th scope="col" class="col_f_icon">&nbsp;</th>\
<th scope="col" class="col_f_topic">Topic</th>';

        // Search page topic lists have an extra column
        if (this.pageType == "search")
        {
            toggleableSectionHTML += '<th scope="col" class="col_f_starter">Forum</th>';
        }

        toggleableSectionHTML += '<th scope="col" class="col_f_starter short">Started By</th>\
<th scope="col" class="col_f_views stats">Stats</th>\
<th scope="col" class="col_f_post">Last Post Info</th>\
</tr>\
</tbody>\
</table>\
</div>\
</div>';

        var temp = document.createElement("div");
        temp.innerHTML = toggleableSectionHTML;
        if (this.pageType == "search")
        {
            postTable.insertBefore(temp.firstChild, postTable.lastChild);
        }
        else
        {
            // Move one element past where we want to insert the toggleable section
            for (var i = 0; i < 2; i++)
            {
                postTable = postTable.nextSibling;
                while (postTable.nodeType != 1)
                {
                    postTable = postTable.nextSibling;
                }
            }
            postTable.parentNode.insertBefore(temp.firstChild, postTable);
        }

        var control = document.getElementById("toggle_ignored_topics");
        control.addEventListener("click", function(e)
        {
            unsafeWindow.Element.toggle(document.getElementById("ignored_topics"));
            if (unsafeWindow.Element.hasClassName(this.parentNode, "collapsed"))
            {
                unsafeWindow.Element.removeClassName(this.parentNode, "collapsed");
            }
            else
            {
                unsafeWindow.Element.addClassName(this.parentNode, "collapsed");
            }
            unsafeWindow.Event.stop(e);
        }, false);
    },

    // className functions
    // Dean Edwards 2004.10.24
    addClass: function(element, className)
    {
        if (element.className)
        {
            element.className += " " + className;
        }
        else
        {
            element.className = className;
        }
    },

    removeClass: function(element, className)
    {
        var regexp = new RegExp("(^|\\s)" + className + "(\\s|$)");
        element.className = element.className.replace(regexp, "$2");
    },

    hasClass: function(element, className)
    {
        var regexp = new RegExp("(^|\\s)" + className + "(\\s|$)");
        return regexp.test(element.className);
    },

    fixRowStriping: function(xPath)
    {
        var rowNodes =
            document.evaluate(
                xPath,
                document,
                null,
                XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                null);

        for (var i = 0; i < rowNodes.snapshotLength; i++)
        {
            var rowNode = rowNodes.snapshotItem(i);
            var expectedClass = (i % 2 == 0 ? "row1" : "row2");
            var otherClass = (expectedClass == "row1" ? "row2" : "row1");
            if (!this.hasClass(rowNode, expectedClass))
            {
                this.removeClass(rowNode, otherClass);
                this.addClass(rowNode, expectedClass);
            }
        }
    },

    /**
     * Ensures topics are alternately striped.
     */
    fixTopicStriping: function()
    {
        // Topics
        this.fixRowStriping("//table[@id='forum_table']/tbody/tr[@class!='header']");
        // Ignored topics
        this.fixRowStriping("//div[@id='ignored_topics']/table/tbody/tr[@class!='header']");
    },

    /**
     * Creates an event handling Function for ignoring a topic.
     *
     * @param topicId the id of the topic to be ignored.
     *
     * @return a Function which, when executed, will toggle the ignored state of
     *         the topic with the given id.
     */
    createIgnoreHandler: function(topicId)
    {
        return function(e)
        {
            // Toggle this topic out of the list if it's already there
            var newlyIgnoredTopic = true;
            var ignoredTopicIds = TIL.Config.getIgnoredTopicIds();
            var topicIdIndex = ignoredTopicIds.indexOf(topicId);
            if (topicIdIndex > -1)
            {
                ignoredTopicIds.splice(topicIdIndex, 1);
                newlyIgnoredTopic = false;
            }

            var ignoreControl = e.target;
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
                ignoreControl.src = TIL.plusIconDataURI;
                ignoreControl.title = "Click to stop ignoring this topic";

                TIL.fixTopicStriping();
            }
            else
            {
                // Show that this topic won't be ignored on next page load
                ignoreControl.src = TIL.crossIconDataURI;
                ignoreControl.title = "Click to re-ignore this topic";
            }

            // Store the updated ignored topic list
            TIL.Config.setIgnoredTopicIds(ignoredTopicIds);
        };
    },

    registerControls: function()
    {
        var controls = document.getElementById("section_links");

        // Only insert this link for GM - Chrome will use a page action
        if (isGM && controls)
        {
            controls.insertBefore(this.createLinkControl("Topic Ignore List",
                                                         TIL.UI.show.bind(TIL.UI)),
                                  controls.firstChild);
        }
    },

    createLinkControl: function(name, handler)
    {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "#";
        a.appendChild(document.createTextNode(name));
        a.addEventListener("click", handler, false);
        li.appendChild(a);
        return li;
    }
};

/**
 * Configuration.
 */
TIL.Config =
{
    getIgnoredTopicIds: function()
    {
        var topicIds = GM_getValue("ignoredTopics");
        return (topicIds ? topicIds.split(",") : []);
    },

    setIgnoredTopicIds: function(ignoredTopics)
    {
        GM_setValue("ignoredTopics", ignoredTopics.join(","));
    },

    getIgnoredFolderNames: function()
    {
        var ignoredFolders = GM_getValue("ignoredFolders");
        var ignoredFolderNames = (ignoredFolders ? ignoredFolders.split(",") : []);
        ignoredFolderNames.sort();
        return ignoredFolderNames;
    },

    setIgnoredFolderNames: function(ignoredFolderNames)
    {
        GM_setValue("ignoredFolders", ignoredFolderNames.join(","));
    },

    getCollapseIgnoredTopics: function()
    {
        return this._getBooleanConfig("collapseIgnoredTopics", true);
    },

    setCollapseIgnoredTopics: function(collapseIgnoredTopics)
    {
        GM_setValue("collapseIgnoredTopics", collapseIgnoredTopics);
    },

    /**
     * Retrieves a list of available folders from the forum jump menu, if
     * available, otherwise returns and empty Array.
     */
    getFolderNamesFromCurrentPage: function()
    {
        var folders = [];
        var jumpForm = document.forms.namedItem("forum_jump");
        if (jumpForm)
        {
            var folderNameRegex = /-- (.+)$/;
            var folderSelect = jumpForm.elements.namedItem("showforum");
            for (var i = 0; i < folderSelect.options.length; i++)
            {
                var matches = folderSelect.options[i].text.match(folderNameRegex);
                if (matches != null)
                {
                    folders.push(matches[1]);
                }
            }
        }
        folders.sort();
        return folders;
    },

    _getBooleanConfig: function(configName, defaultValue)
    {
        var config = GM_getValue(configName);
        if (config === undefined)
        {
            GM_setValue(configName, defaultValue);
            config = defaultValue;
        }
        return config;
    }
};

/**
 * Preferences User Interface (UI).
 */
TIL.UI =
{
    PREFS_HTML: "data:text/html;charset=utf-8;base64,PCFET0NUWVBFIGh0bWwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDQuMDEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvVFIvaHRtbDQvc3RyaWN0LmR0ZCI%2BDQo8aHRtbCBsYW5nPSJlbiI%2BDQo8aGVhZD4NCiAgPHRpdGxlPlVzZXJzY3JpcHQgUHJlZmVyZW5jZXM8L3RpdGxlPg0KICA8bWV0YSBodHRwLWVxdWl2PSJDb250ZW50LVR5cGUiIGNvbnRlbnQ9InRleHQvaHRtbDsgY2hhcnNldD1VVEYtOCI%2BDQogIDxtZXRhIG5hbWU9IkF1dGhvciIgY29udGVudD0iSm9uYXRoYW4gQnVjaGFuYW4iPg0KICA8bWV0YSBuYW1lPSJDb3B5cmlnaHQiIGNvbnRlbnQ9IiZjb3B5OyAyMDA2LCBKb25hdGhhbiBCdWNoYW5hbiI%2BDQogIDxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI%2BDQogIGh0bWwgeyBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudCB9DQogIGJvZHkgeyBtYXJnaW46MDsgcGFkZGluZzowOyBiYWNrZ3JvdW5kLWNvbG9yOiB0cmFuc3BhcmVudDsgY29sb3I6ICMxQzI4Mzc7IGZvbnQ6IDEzcHggYXJpYWwsdmVyZGFuYSx0YWhvbWEsc2Fucy1zZXJpZjsgd2lkdGg6IDcyMHB4OyBtYXJnaW46IDAgYXV0bzsgfQ0KICAubW9kdWxlIHsgbWFyZ2luLWJvdHRvbTogNXB4OyB9DQogIC5tb2R1bGUgaDIsIC5tb2R1bGUgY2FwdGlvbiB7DQogICAgLW1vei1ib3JkZXItcmFkaXVzOjVweCA1cHggMCAwOw0KICAgIGZvbnQtc2l6ZToxNHB4Ow0KICAgIGZvbnQtd2VpZ2h0Om5vcm1hbDsNCiAgICBtYXJnaW46MCAhaW1wb3J0YW50Ow0KICAgIG92ZXJmbG93OmhpZGRlbjsNCiAgICBwYWRkaW5nOjhweCAhaW1wb3J0YW50Ow0KICAgIGJhY2tncm91bmQ6dXJsKCJodHRwOi8vd3d3LnJsbG11a2ZvcnVtLmNvbS9wdWJsaWMvc3R5bGVfaW1hZ2VzL21hc3Rlci9ncmFkaWVudF9iZy5wbmciKSByZXBlYXQteCBzY3JvbGwgbGVmdCA1MCUgIzFEMzY1MjsNCiAgICBjb2xvcjojRkZGRkZGOw0KICB9DQoNCiAgLmZvcm0tcm93IHsgb3ZlcmZsb3c6IGhpZGRlbjsgcGFkZGluZzogOHB4IDEycHg7IGZvbnQtc2l6ZTogMTFweDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNlZWU7IGJvcmRlci1yaWdodDogMXB4IHNvbGlkICNlZWU7IGJhY2tncm91bmQtY29sb3I6ICNmZmY7fQ0KICAuZm9ybS1yb3cgaW1nLCAuZm9ybS1yb3cgaW5wdXQgeyB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlOyB9DQogIC5mb3JtLWZpZWxkIHsgZmxvYXQ6IGxlZnQ7IH0NCiAgLmFsaWduZWQgbGFiZWwgeyBwYWRkaW5nOiAwIDFlbSAzcHggMDsgZmxvYXQ6IGxlZnQ7IHdpZHRoOiA4ZW07IH0NCiAgLmNoZWNrYm94LXJvdyBsYWJlbCB7IHBhZGRpbmc6IDA7IGZsb2F0OiBub25lOyB3aWR0aDogYXV0bzsgYmFja2dyb3VuZC1jb2xvcjogI2ZmZjsgfQ0KICAuc3VibWl0LXJvdyB7IHBhZGRpbmc6IDhweCAxMnB4OyB0ZXh0LWFsaWduOiByaWdodDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNlZWU7IGJvcmRlci1yaWdodDogMXB4IHNvbGlkICNlZWU7IGJhY2tncm91bmQtY29sb3I6ICNmZmY7IH0NCg0KICB1bCB7IG1hcmdpbjogMDsgcGFkZGluZzogMCAwIDAgMS41ZW07IGxpbmUtaGVpZ2h0OiAxLjVlbTsgfQ0KICBsaSB7IG1hcmdpbjogMDsgcGFkZGluZzogMDsgfQ0KDQogIHNwYW4uY29udHJvbCB7IHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lOyBjdXJzb3I6IHBvaW50ZXI7IGNvbG9yOiAjMDBmOyB9DQoNCiAgLnNlbGVjdG9yIHsgd2lkdGg6NTgwcHg7IGZsb2F0OmxlZnQ7IH0NCiAgLnNlbGVjdG9yIHNlbGVjdCB7IHdpZHRoOjI3MHB4OyBoZWlnaHQ6MTcuMmVtOyB9DQogIC5zZWxlY3Rvci1hdmFpbGFibGUsIC5zZWxlY3Rvci1jaG9zZW4geyBmbG9hdDpsZWZ0OyB3aWR0aDoyNzBweDsgdGV4dC1hbGlnbjpjZW50ZXI7IG1hcmdpbi1ib3R0b206NXB4OyB9DQogIC5zZWxlY3Rvci1hdmFpbGFibGUgaDIsIC5zZWxlY3Rvci1jaG9zZW4gaDIgeyBib3JkZXI6MXB4IHNvbGlkICNjY2M7IH0NCiAgLnNlbGVjdG9yIC5zZWxlY3Rvci1hdmFpbGFibGUgaDIgeyBiYWNrZ3JvdW5kOndoaXRlIHVybCgiZGF0YTppbWFnZS9naWY7YmFzZTY0LFIwbEdPRGxoRVFBZkFNUUFBUGYzOSUyQjN0N2VmbjUlMkJycTZ2MzklMkZmcjYlMkJ2RHc4UFB6OCUyRlB6OHVUazVQSHg4ZUhoNGU3dTd2djclMkIlMkZqNCUyQk9qbzZQWDE5ZUxpNHZ6OCUyRk96czdQbjUlMkJmYjI5dWJtNXY3JTJCJTJGdiUyRiUyRiUyRndBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFDSDVCQUFBQUFBQUxBQUFBQUFSQUI4QUFBV09JQ2FPWkdtZWFLcXViT3U2Vnl6UGRHM1hSSzd2ZkM3OXdLRHcxeWdhajhoaVljbHNPcGVVcUhSS2pUcXUyS3oyQ3VoNnYlMkJCdVpVd3VtOGVRdEhyTlRoJTJGZThMajhnRkRZNyUyRmk4M2NEdiUyQiUyRjk4RElLRGhJV0NBWWlKaW91SUU0NlBrSkdPQTVTVmxwZVVENXFibkoyYUFxQ2hvcU9nRnFhbnFLbW1DYXl0cnElMkJzRWJLenRMV3lDN2k1dXJ1NElRQTciKSBib3R0b20gbGVmdCByZXBlYXQteDsgY29sb3I6IzY2NjsgfQ0KICAuc2VsZWN0b3IgLnNlbGVjdG9yLWF2YWlsYWJsZSBpbnB1dCB7IHdpZHRoOjIzMHB4OyB9DQogIC5zZWxlY3RvciB1bC5zZWxlY3Rvci1jaG9vc2VyIHsgZmxvYXQ6bGVmdDsgd2lkdGg6MjJweDsgaGVpZ2h0OjUwcHg7IGJhY2tncm91bmQ6dXJsKCJkYXRhOmltYWdlL2dpZjtiYXNlNjQsUjBsR09EbGhGZ0F2QUxNQUFQNyUyQiUyRnUlMkZ2NyUyRkh4OGYzOSUyRmZmMzklMkZQejglMkZqNCUyQlBMeTh2RHc4UG41JTJCZiUyRiUyRiUyRiUyQjd1N2dBQUFBQUFBQUFBQUFBQUFDSDVCQUFBQUFBQUxBQUFBQUFXQUM4QUFBUjBVTWtKVEJGcmlXTEElMkZCUVJaQ1FaRUI2b0RFZnBrc2NBRHNockw0Zzh0YmQ5VElSZWo2QUFqSVMyQUNDQjdGbWF0d3ZVaGpoT3I5aXNkc3Z0ZXIlMkZnc0hoTUxwdlA2TFI2YmJabUE1anRobHRnYmp2dXFWSVJ6QklsY1ZNQ0tTczFVRGt6UEVJeEtrVWlOeWVFalJWU0doeVNFaEVBT3clM0QlM0QiKSB0b3AgY2VudGVyIG5vLXJlcGVhdDsgbWFyZ2luOjhlbSAzcHggMCAzcHg7IHBhZGRpbmc6MDsgfQ0KICAuc2VsZWN0b3ItY2hvb3NlciBsaSB7IG1hcmdpbjowOyBwYWRkaW5nOjNweDsgbGlzdC1zdHlsZS10eXBlOm5vbmU7IH0NCiAgLnNlbGVjdG9yIHNlbGVjdCB7IG1hcmdpbi1ib3R0b206NXB4OyBtYXJnaW4tdG9wOjA7IH0NCiAgLnNlbGVjdG9yLWFkZCwgLnNlbGVjdG9yLXJlbW92ZSB7IHdpZHRoOjE2cHg7IGhlaWdodDoxNnB4OyBkaXNwbGF5OmJsb2NrOyB0ZXh0LWluZGVudDotMzAwMHB4OyB9DQogIC5zZWxlY3Rvci1hZGQgeyBjdXJzb3I6IHBvaW50ZXI7IGJhY2tncm91bmQ6dXJsKCJkYXRhOmltYWdlL2dpZjtiYXNlNjQsUjBsR09EbGhFQUFRQU9aWkFJYXB6WW1zejQlMkJ2MGRyazclMkJmdTlaYTAxYU85MTN1Z3hvV295MzZpeDdUSjMlMkJydzklMkJEcDhyalA1b09teVpxNTE0Q2t5ZjMlMkIlMkZ1N3olMkJMUEkzb2lxelk2dHpwT3kwdSUyRjAlMkJLckMybiUyQmp5YjdRNVlPbnk1bTMxWUNqeUklMkJ2MEgyaXglMkJIcTg1YTExTG5ONHFPOTJhTyUyQjJwMjUxbnloeDRLbHlwbTQxNlclMkYyN2JONUo2NjFuJTJCa3liTEs0JTJGUDIlMkJvS215bjJoeDVxNDF2SDElMkJiYkszMzZqeUpHeDBvNnUwT3Z3OXJiTjVhUyUyRjI0U296TUxVNTl6bThZcXN6cGk0MW55aHhvJTJCdzBZQ2t5cGUxMUllcHpPenk5NSUyQjgyT252OXFLJTJCMjU2NzE3VE01Sld6MU1mWTZhWEIzSkt4MDMlMkJqeUxISDNiUEw0NWUyMVoyNjJLekc0Sk96MDRlcXphWEEzSTZ2MGZYNCUyQiUyRiUyRiUyRiUyRndBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQ0g1QkFFQUFGa0FMQUFBQUFBUUFCQUFBQWU3Z0ZtQ1dRd1lEaGxCSFFZRGc0TVJFd2hIU1EwTk9Fd1VUeGVOVHhZdFVKJTJCZ1VCdyUyRkVvSUtIbE9wcVNxcVV5RlBXVVFRT1ZhMXRVWkx0bFlJQXpNMlVzREJCRmc3d1JZR0ZVMEZCU2tMemk1WVdCckxTZ2NKQXRnajBkdlJJdGd3Q1FIaVNOemJSZUltRlRvQUFFSUU3ekxSSmV3QUJ3b3ZWZm42SUZnciUyQmhzR2JueTRRckFnRHhJRnI3QmdwQUFCbFljUFkwQ2tnbW5Ra3lGUk1tck0yT05BS1VHUElBRHg4ZUFCaWhvbk1qVVNWTWdCRFNjSkZqVUtCQUE3IikgdG9wIGNlbnRlciBuby1yZXBlYXQ7IG1hcmdpbi1ib3R0b206MnB4OyB9DQogIC5zZWxlY3Rvci1yZW1vdmUgeyBjdXJzb3I6IHBvaW50ZXI7IGJhY2tncm91bmQ6dXJsKCJkYXRhOmltYWdlL2dpZjtiYXNlNjQsUjBsR09EbGhFQUFRQU5VJTJCQU1IQndieTh2UFB6ODdTMHRMR3hzYzdXM2EyMXZiQ3hzc1hGeGJ1N3UlMkJEZzRQRHc4TEs3eGN6TXpMbTV1Zno5JTJGYXl3dGJLeXN1YnE3OVhjNDhQRHc3NiUyQnZzdkx5OHJLeXZuNSUyQmJLN3hLNndzcSUyQjN2OTNkM2VqczhNTEN3dHJhMnQ3ZTN1dnI2OCUyRlB6N096czdPOHhyYTJ0c2ZIeCUyRmo0JTJCTzN0N2VUcDdmSHg4Y0RBd0slMkJ4c3ZiMjl0TFMwdUxtNjlqWTJNM056Ykc2dzdpNHVOdmIyOG5KeWM3T3pyVzF0ZFhWMWNqSXlMZTN0OFRFeEwlMkIlMkZ2JTJGWDQlMkIlMkYlMkYlMkYlMkZ3QUFBQ0g1QkFFQUFENEFMQUFBQUFBUUFCQUFBQWFyUUolMkZRTjlsb1NqcVdvVEFjUGpJT0VVZWhBTGtTc2s1VFJxRjV2MTRUUVNKazhIQm85Q2VOMjhsOHFWdk1ScmNwQkhYNnJFQ3E1UDQ1SEQwcWdIOEFCaEE4QUlzd1BUMG5BcEVYQUNzRUJ3R1lPSTQ5R0pzNW1CRUhNNk1JbTUyT0NLTVJFQU0zcmhTT0xRdXpQSzRFREFNNnVqcWxLTHU2TndZdkl6ekZ4UlloeHNVRFRBd09POURRT2RFN1dFTXlDVFhhMjlvVlkwNFpOeDRYRFEwV096cFpUVUpGR3EwSFMwMUJBRHMlM0QiKSB0b3AgY2VudGVyIG5vLXJlcGVhdDsgfQ0KICBzcGFuLnNlbGVjdG9yLWNsZWFyYWxsIHsgY3Vyc29yOiBwb2ludGVyOyBkaXNwbGF5OmJsb2NrOyB3aWR0aDo2ZW07IHRleHQtYWxpZ246bGVmdDsgbWFyZ2luLWxlZnQ6YXV0bzsgbWFyZ2luLXJpZ2h0OmF1dG87IGZvbnQtd2VpZ2h0OmJvbGQ7IGNvbG9yOiM2NjY7ICBwYWRkaW5nOjNweCAwIDNweCAxOHB4OyB9DQogIHNwYW4uc2VsZWN0b3ItY2xlYXJhbGw6aG92ZXIgeyBjb2xvcjojMDM2OyB9DQogIHNwYW4uc2VsZWN0b3ItY2xlYXJhbGwgeyBiYWNrZ3JvdW5kOnVybCgiZGF0YTppbWFnZS9naWY7YmFzZTY0LFIwbEdPRGxoRUFBUUFOVXNBTlhWMWN2THk3JTJCJTJGdjZ1cnE2eXNyTHk4dk5uWjJkYlcxdDdlM3FhbXByS3lzc1RFeEtpb3FNbkp5YXFxcXJHeHNlVGs1SzZ1cnJtNXVjN096cW1wcWFXbHBiT3pzOUhSMGQzZDNlJTJGdjclMkZmMzklMkJmbjU5cmEydGpZMk0lMkZQejc2JTJCdnRMUzB2YjI5dGZYMTlUVTFMcTZ1dkx5OHJ1N3U3YTJ0dVBqNDZlbnA4Zkh4JTJGajQlMkJQJTJGJTJGJTJGd0FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUNINUJBRUFBQ3dBTEFBQUFBQVFBQkFBQUFhQVFKWndTQ3dhajBnV3BFQ2hGQ0RJbFNyU09Cd2FFZFhLcUpJQXZpSUVRS0lxb2dhQk5LQ0VTZzlRUk5OSklPQm9WaGo2eVVSTVBVZ2JLNElkRmhZUEtYME9IeG1DS3lNREF3NklReVlWS1FRSWdpQXBLUlY4UXlnSko2TVhJUWFqQ1hCRUtnb3FyaDRHckdWRlVnUUxFeE1MQkZwSUtDWU1EQ2FxU2NURlJVRUFPdyUzRCUzRCIpIGxlZnQgY2VudGVyIG5vLXJlcGVhdDsgfQ0KICA8L3N0eWxlPg0KICA8c2NyaXB0IHR5cGU9InRleHQvamF2YXNjcmlwdCI%2BDQogIHZhciBTZWxlY3RzID0NCiAgew0KICAgICAgbW92ZVNlbGVjdGVkT3B0aW9uczogZnVuY3Rpb24oZnJvbSwgdG8pDQogICAgICB7DQogICAgICAgICAgdmFyIGZyb20gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChmcm9tKQ0KICAgICAgICAgIHZhciB0byA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRvKTsNCiAgICAgICAgICB2YXIgb3B0aW9uOw0KDQogICAgICAgICAgZm9yICh2YXIgaSA9IGZyb20ub3B0aW9ucy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkNCiAgICAgICAgICB7DQogICAgICAgICAgICAgIG9wdGlvbiA9IGZyb20ub3B0aW9uc1tpXTsNCiAgICAgICAgICAgICAgaWYgKG9wdGlvbi5zZWxlY3RlZCA9PSB0cnVlKQ0KICAgICAgICAgICAgICB7DQogICAgICAgICAgICAgICAgICB0by5hcHBlbmRDaGlsZChvcHRpb24pOw0KICAgICAgICAgICAgICB9DQogICAgICAgICAgfQ0KICAgICAgfSwNCg0KICAgICAgbW92ZUFsbE9wdGlvbnM6IGZ1bmN0aW9uKGZyb20sIHRvKQ0KICAgICAgew0KICAgICAgICAgIHZhciBmcm9tID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZnJvbSk7DQogICAgICAgICAgdmFyIHRvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodG8pOw0KICAgICAgICAgIHZhciBvcHRpb247DQoNCiAgICAgICAgICBmb3IgKHZhciBpID0gZnJvbS5vcHRpb25zLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKQ0KICAgICAgICAgIHsNCiAgICAgICAgICAgICAgb3B0aW9uID0gZnJvbS5vcHRpb25zW2ldOw0KICAgICAgICAgICAgICB0by5hcHBlbmRDaGlsZChvcHRpb24pOw0KICAgICAgICAgIH0NCiAgICAgIH0NCiAgfTsNCiAgPC9zY3JpcHQ%2BDQoNCjwvaGVhZD4NCjxib2R5Pg0KDQo8Zm9ybSBuYW1lPSJwcmVmZXJlbmNlcyIgaWQ9InByZWZlcmVuY2VzIiBjbGFzcz0iYWxpZ25lZCI%2BDQogIDxkaXYgY2xhc3M9Im1vZHVsZSI%2BDQogICAgPGgyPlRvcGljIElnbm9yZSBMaXN0IFByZWZlcmVuY2VzPC9oMj4NCiAgICA8ZGl2IGNsYXNzPSJmb3JtLXJvdyI%2BDQogICAgICA8bGFiZWw%2BRm9sZGVyczo8L2xhYmVsPg0KICAgICAgPGRpdiBjbGFzcz0ic2VsZWN0b3IiPg0KICAgICAgICA8ZGl2IGNsYXNzPSJzZWxlY3Rvci1hdmFpbGFibGUiPg0KICAgICAgICAgIDxoMj5BdmFpbGFibGUgRm9sZGVyczwvaDI%2BDQogICAgICAgICAgPHNlbGVjdCBpZD0iYWxsX2ZvbGRlcnMiIGNsYXNzPSJmaWx0ZXJlZCIgbmFtZT0iYWxsX2ZvbGRlcnMiIHNpemU9IjE1IiBtdWx0aXBsZT0ibXVsdGlwbGUiPg0KICAgICAgICAgIDwvc2VsZWN0Pg0KICAgICAgICA8L2Rpdj4NCg0KICAgICAgICA8dWwgY2xhc3M9InNlbGVjdG9yLWNob29zZXIiPg0KICAgICAgICAgIDxsaT48c3BhbiBjbGFzcz0ic2VsZWN0b3ItYWRkIiBvbmNsaWNrPSdTZWxlY3RzLm1vdmVTZWxlY3RlZE9wdGlvbnMoImFsbF9mb2xkZXJzIiwiaWdub3JlZF9mb2xkZXJzIik7Jz5BZGQ8L3NwYW4%2BPC9saT4NCiAgICAgICAgICA8bGk%2BPHNwYW4gY2xhc3M9InNlbGVjdG9yLXJlbW92ZSIgb25jbGljaz0nU2VsZWN0cy5tb3ZlU2VsZWN0ZWRPcHRpb25zKCJpZ25vcmVkX2ZvbGRlcnMiLCJhbGxfZm9sZGVycyIpOyc%2BUmVtb3ZlPC9zcGFuPjwvbGk%2BDQogICAgICAgIDwvdWw%2BDQoNCiAgICAgICAgPGRpdiBjbGFzcz0ic2VsZWN0b3ItY2hvc2VuIj4NCiAgICAgICAgICA8aDI%2BSWdub3JlZCBGb2xkZXJzPC9oMj4NCiAgICAgICAgICA8c2VsZWN0IGNsYXNzPSJmaWx0ZXJlZCIgbmFtZT0iaWdub3JlZF9mb2xkZXJzIiBzaXplPSIxNSIgbXVsdGlwbGU9Im11bHRpcGxlIiBpZD0iaWdub3JlZF9mb2xkZXJzIj4NCiAgICAgICAgICA8L3NlbGVjdD4NCiAgICAgICAgICA8c3BhbiBjbGFzcz0ic2VsZWN0b3ItY2xlYXJhbGwiIG9uY2xpY2s9J1NlbGVjdHMubW92ZUFsbE9wdGlvbnMoImlnbm9yZWRfZm9sZGVycyIsICJhbGxfZm9sZGVycyIpOyc%2BQ2xlYXIgYWxsPC9zcGFuPg0KICAgICAgICA8L2Rpdj4NCiAgICAgIDwvZGl2Pg0KICAgIDwvZGl2Pg0KICAgIDxkaXYgY2xhc3M9ImZvcm0tcm93IGNoZWNrYm94LXJvdyI%2BDQogICAgICA8bGFiZWwgZm9yPSJjb2xsYXBzZV9pZ25vcmVkX3RvcGljcyI%2BPGlucHV0IHR5cGU9ImNoZWNrYm94IiBuYW1lPSJjb2xsYXBzZV9pZ25vcmVkX3RvcGljcyIgaWQ9ImNvbGxhcHNlX2lnbm9yZWRfdG9waWNzIj4gQ29sbGFwc2UgSWdub3JlZCBUb3BpY3Mgc2VjdGlvbiBieSBkZWZhdWx0PC9sYWJlbD4NCiAgICA8L2Rpdj4NCiAgPC9kaXY%2BDQoNCiAgPGRpdiBjbGFzcz0ibW9kdWxlIj4NCiAgICA8ZGl2IGNsYXNzPSJzdWJtaXQtcm93Ij4NCiAgICAgIDxpbnB1dCB0eXBlPSJidXR0b24iIHZhbHVlPSJDbG9zZSIgbmFtZT0iY2xvc2VfYnV0dG9uIiBpZD0iY2xvc2VfYnV0dG9uIj4NCiAgICAgIDxpbnB1dCB0eXBlPSJidXR0b24iIHZhbHVlPSJTYXZlIFByZWZlcmVuY2VzIiBuYW1lPSJzYXZlX2J1dHRvbiIgaWQ9InNhdmVfYnV0dG9uIj4NCiAgICA8L2Rpdj4NCiAgPC9kaXY%2BDQo8L2Zvcm0%2BDQoNCjwvYm9keT4NCjwvaHRtbD4%3D",

    // This will only be called when running on GreaseMonkey, as the Chrome
    // extension will use a page action to display the preferences dialogue.
    show: function(e)
    {
        if (e)
        {
            e.preventDefault();
            e.stopPropagation();
        }

        var blocker = document.createElement("div");
        this.blocker = blocker;
        blocker.id = "til_blocker";
        blocker.style.position = "fixed";
        blocker.style.top = "0px";
        blocker.style.right = "0px";
        blocker.style.bottom = "0px";
        blocker.style.left = "0px";
        blocker.style.backgroundColor = "#000";
        blocker.style.opacity = "0.5";
        blocker.style.zIndex = "10000";
        document.body.appendChild(blocker);

        var prefs = document.createElement("iframe");
        prefs.addEventListener("load", this.preferenceDocumentLoadHandler.bind(this), false);
        this.prefs = prefs;

        document.body.appendChild(prefs);

        prefs.id = "til_preferences";
        prefs.name = "til_preferences";
        prefs.style.position = "fixed";
        prefs.style.top = "1em";
        prefs.style.left = "0px";
        prefs.style.right = "0px";
        prefs.style.border = "none";
        prefs.style.height = "100%";
        prefs.style.width = "100%";
        prefs.style.overflow = "hidden";
        prefs.style.zIndex = "10001";
        prefs.src = this.PREFS_HTML;
    },

    hide: function(e)
    {
        if (isGM)
        {
            document.body.removeChild(this.prefs);
            document.body.removeChild(this.blocker);
            this.prefs = null;
            this.blocker = null;
        }
        else
        {
            window.close();
        }
    },

    getDocument: function()
    {
        return (isGM ? this.prefs.contentDocument : document);
    },

    preferenceDocumentLoadHandler: function()
    {
        var form = this.getDocument().forms.namedItem("preferences");

        // Set up form state
        if (folderNames == null || folderNames.length == 0)
        {
            folderNames = TIL.Config.getFolderNamesFromCurrentPage();
        }
        var ignoredFolders = TIL.Config.getIgnoredFolderNames();
        this.populateFolderSelects(folderNames, ignoredFolders);
        form.elements.namedItem("collapse_ignored_topics").checked = TIL.Config.getCollapseIgnoredTopics();

        // Set up event handlers
        form.elements.namedItem("close_button").addEventListener("click", this.hide.bind(this), false);
        form.elements.namedItem("save_button").addEventListener("click", this.saveConfigurationHandler.bind(this), false);
    },

    populateFolderSelects: function(folders, ignoredFolders)
    {
        var document = this.getDocument();
        var form = document.forms.namedItem("preferences");
        folders.forEach(function(folderName)
        {
            var option = document.createElement("option");
            option.text = folderName;
            if (ignoredFolders.indexOf(folderName) == -1)
            {
                form.elements.namedItem("all_folders").appendChild(option);
            }
        });
        ignoredFolders.forEach(function(folderName)
        {
            var option = document.createElement("option");
            option.text = folderName;
            form.elements.namedItem("ignored_folders").appendChild(option);
        });
    },

    saveConfigurationHandler: function()
    {
        var ignoredFolders = [];
        var form = this.getDocument().forms.namedItem("preferences");
        var select = form.elements.namedItem("ignored_folders");
        for (var i = 0; i < select.options.length; i++)
        {
            ignoredFolders.push(select.options[i].text);
        }
        TIL.Config.setIgnoredFolderNames(ignoredFolders);
        TIL.Config.setCollapseIgnoredTopics(form.elements.namedItem("collapse_ignored_topics").checked);
        this.hide();
    }
};

// Chrome will use another content script to initialise the script.
if (isGM)
{
    TIL.init();
}
