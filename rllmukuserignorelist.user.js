// ==UserScript==
// @name        Rllmuk User Ignore List
// @namespace   http://www.jonathanbuchanan.plus.com/repos/greasemonkey/
// @description Implements a user ignore list which removes all traces of the users on the list and optionally removes topics created by ignored users and posts which quote ignored users. The ignore list can be synchronised with your Manage Ignored Users settings when viewing that page.
// @include     http://www.rllmukforum.com/*
// @include     http://rllmukforum.com/*
// @include     http://www.rpsoft.co.uk/*
// @include     http://rpsoft.co.uk/*
// @include     http://www.extranoise.co.uk/*
// @include     http://extranoise.co.uk/*
// ==/UserScript==

/* Changelog
 * ---------
 * 2007-02-20 Minor style update to remove multiple scrollbars when the window
 *            is smaller than the preferences dialogue.
 * 2007-02-19 No longer using User Script Commands menu - Script controls are
 *            now integrated into pages.
 * 2007-01-25 Added extranoise.co.uk domain.
 * 2007-01-24 "Complex" configuration data is now stored as JSON - added the
 *            JSON library to the script for this purpose.
 *            Added ignoring of specific users only in specific topics.
 *            Refactored the script, placing everything under a "UIL" object.
 * 2006-11-02 Added GUI for configuration instead of using clunky menu items.
 *            Added removal of topics created by ignored users.
 * 2006-09-09 Fixed bug where the number of posts reported as being removed was
 *            incorrect when an ignored user was quoted repeatedly.
 *            Removed isInArray function: now using JS 1.6's Array.indexOf
 *            URL substring checks are now performed on a lowercase version of
 *            the URL - this fixes removal of posts on the Reply page.
 * 2006-03-10 Updated to work with latest version of Greasemonkey and to remove
 *            posts containing quotes from ignored users.
 * 2005-05-26 Functionally complete version finished, tidied up and commented.
 * -------------------------------------------------------------------------- */

String.prototype.endsWith = function(s)
{
    lastIndex = this.lastIndexOf(s);
    return (lastIndex != -1 && lastIndex == (this.length - s.length));
};

Function.prototype.bind = function(object)
{
    var __method = this;
    return function()
    {
        __method.apply(object, arguments);
    }
};

/*
Copyright (c) 2005 JSON.org

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The Software shall be used for Good, not Evil.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
var JSON = {
    org: 'http://www.JSON.org',
    copyright: '(c)2005 JSON.org',
    license: 'http://www.crockford.com/JSON/license.html',
    stringify: function (arg) {
        var c, i, l, s = '', v;

        switch (typeof arg) {
        case 'object':
            if (arg) {
                if (arg.constructor == Array) {
                    for (i = 0; i < arg.length; ++i) {
                        v = this.stringify(arg[i]);
                        if (s) {
                            s += ',';
                        }
                        s += v;
                    }
                    return '[' + s + ']';
                } else if (typeof arg.toString != 'undefined') {
                    for (i in arg) {
                        v = arg[i];
                        if (typeof v != 'undefined' && typeof v != 'function') {
                            v = this.stringify(v);
                            if (s) {
                                s += ',';
                            }
                            s += this.stringify(i) + ':' + v;
                        }
                    }
                    return '{' + s + '}';
                }
            }
            return 'null';
        case 'number':
            return isFinite(arg) ? String(arg) : 'null';
        case 'string':
            l = arg.length;
            s = '"';
            for (i = 0; i < l; i += 1) {
                c = arg.charAt(i);
                if (c >= ' ') {
                    if (c == '\\' || c == '"') {
                        s += '\\';
                    }
                    s += c;
                } else {
                    switch (c) {
                        case '\b':
                            s += '\\b';
                            break;
                        case '\f':
                            s += '\\f';
                            break;
                        case '\n':
                            s += '\\n';
                            break;
                        case '\r':
                            s += '\\r';
                            break;
                        case '\t':
                            s += '\\t';
                            break;
                        default:
                            c = c.charCodeAt();
                            s += '\\u00' + Math.floor(c / 16).toString(16) +
                                (c % 16).toString(16);
                    }
                }
            }
            return s + '"';
        case 'boolean':
            return String(arg);
        default:
            return 'null';
        }
    },
    parse: function (text) {
        var at = 0;
        var ch = ' ';

        function error(m) {
            throw {
                name: 'JSONError',
                message: m,
                at: at - 1,
                text: text
            };
        }

        function next() {
            ch = text.charAt(at);
            at += 1;
            return ch;
        }

        function white() {
            while (ch) {
                if (ch <= ' ') {
                    next();
                } else if (ch == '/') {
                    switch (next()) {
                        case '/':
                            while (next() && ch != '\n' && ch != '\r') {}
                            break;
                        case '*':
                            next();
                            for (;;) {
                                if (ch) {
                                    if (ch == '*') {
                                        if (next() == '/') {
                                            next();
                                            break;
                                        }
                                    } else {
                                        next();
                                    }
                                } else {
                                    error("Unterminated comment");
                                }
                            }
                            break;
                        default:
                            error("Syntax error");
                    }
                } else {
                    break;
                }
            }
        }

        function string() {
            var i, s = '', t, u;

            if (ch == '"') {
outer:          while (next()) {
                    if (ch == '"') {
                        next();
                        return s;
                    } else if (ch == '\\') {
                        switch (next()) {
                        case 'b':
                            s += '\b';
                            break;
                        case 'f':
                            s += '\f';
                            break;
                        case 'n':
                            s += '\n';
                            break;
                        case 'r':
                            s += '\r';
                            break;
                        case 't':
                            s += '\t';
                            break;
                        case 'u':
                            u = 0;
                            for (i = 0; i < 4; i += 1) {
                                t = parseInt(next(), 16);
                                if (!isFinite(t)) {
                                    break outer;
                                }
                                u = u * 16 + t;
                            }
                            s += String.fromCharCode(u);
                            break;
                        default:
                            s += ch;
                        }
                    } else {
                        s += ch;
                    }
                }
            }
            error("Bad string");
        }

        function array() {
            var a = [];

            if (ch == '[') {
                next();
                white();
                if (ch == ']') {
                    next();
                    return a;
                }
                while (ch) {
                    a.push(value());
                    white();
                    if (ch == ']') {
                        next();
                        return a;
                    } else if (ch != ',') {
                        break;
                    }
                    next();
                    white();
                }
            }
            error("Bad array");
        }

        function object() {
            var k, o = {};

            if (ch == '{') {
                next();
                white();
                if (ch == '}') {
                    next();
                    return o;
                }
                while (ch) {
                    k = string();
                    white();
                    if (ch != ':') {
                        break;
                    }
                    next();
                    o[k] = value();
                    white();
                    if (ch == '}') {
                        next();
                        return o;
                    } else if (ch != ',') {
                        break;
                    }
                    next();
                    white();
                }
            }
            error("Bad object");
        }

        function number() {
            var n = '', v;
            if (ch == '-') {
                n = '-';
                next();
            }
            while (ch >= '0' && ch <= '9') {
                n += ch;
                next();
            }
            if (ch == '.') {
                n += '.';
                while (next() && ch >= '0' && ch <= '9') {
                    n += ch;
                }
            }
            if (ch == 'e' || ch == 'E') {
                n += 'e';
                next();
                if (ch == '-' || ch == '+') {
                    n += ch;
                    next();
                }
                while (ch >= '0' && ch <= '9') {
                    n += ch;
                    next();
                }
            }
            v = +n;
            if (!isFinite(v)) {
                ////error("Bad number");
            } else {
                return v;
            }
        }

        function word() {
            switch (ch) {
                case 't':
                    if (next() == 'r' && next() == 'u' && next() == 'e') {
                        next();
                        return true;
                    }
                    break;
                case 'f':
                    if (next() == 'a' && next() == 'l' && next() == 's' &&
                            next() == 'e') {
                        next();
                        return false;
                    }
                    break;
                case 'n':
                    if (next() == 'u' && next() == 'l' && next() == 'l') {
                        next();
                        return null;
                    }
                    break;
            }
            error("Syntax error");
        }

        function value() {
            white();
            switch (ch) {
                case '{':
                    return object();
                case '[':
                    return array();
                case '"':
                    return string();
                case '-':
                    return number();
                default:
                    return ch >= '0' && ch <= '9' ? number() : word();
            }
        }

        return value();
    }
};

/**
 * Processing of the current page.
 */
var UIL =
{
    init: function()
    {
        var pageType = this.determineCurrentPageType();
        this.processPage(pageType);
        this.registerControls(pageType);
    },

    determineCurrentPageType: function()
    {
        var pageType = null;
        if (window.location.href.toLowerCase().indexOf("showtopic=") != -1 ||
            window.location.href.indexOf("act=ST") != -1)
        {
            pageType = "topic";
        }
        else if ((window.location.href.toLowerCase().indexOf("act=post") != -1 ||
                  window.location.href.endsWith("/index.php?")) &&
                 document.forms.namedItem("REPLIER").elements.namedItem("t") !== null)
        {
            pageType = "postEditPreview";
        }
        else if (window.location.href.indexOf("showforum=") != -1 ||
                 window.location.href.indexOf("act=SF") != -1 ||
                 window.location.href.indexOf("searchid=") != -1)
        {
            pageType = "topicListing";
        }
        else if (window.location.href.indexOf("/index.php?act=UserCP&CODE=ignore") != -1 ||
                 document.evaluate(
                     "//div[@class='formsubtitle' and text()='Manage your ignored users']",
                     document,
                     null,
                     XPathResult.FIRST_ORDERED_NODE_TYPE,
                     null).singleNodeValue != null)
        {
            pageType = "ignoredUsers";
        }
        return pageType;
    },

    processPage: function(pageType)
    {
        if (pageType !== null)
        {
            var pageProcessor = pageType + "PageProcessor";
            if (typeof(this[pageProcessor]) == "function")
            {
                var removedItemCount = this[pageType + "PageProcessor"]();
                if (UIL.Config.getNotification() === true && removedItemCount > 0)
                {
                    this.notifyOfItemRemoval(removedItemCount);
                }
            }
        }
    },

    topicPageProcessor: function()
    {
        var itemsRemoved = 0;
        var topicId = this.getTopicIdFromCurrentPage();
        var ignoredUsers =
            UIL.Config.getGloballyIgnoredUsers()
                .concat(UIL.Config.getIgnoredUsersForTopic(topicId));

        // Get a list of username links
        var nodes =
            document.evaluate(
                "//span[@class='normalname']/a",
                document,
                null,
                XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                null);

        // Remove posts made by ignored usernames
        for (var i = 0; i < nodes.snapshotLength; i++)
        {
            var node = nodes.snapshotItem(i);
            if (ignoredUsers.indexOf(node.innerHTML) != -1)
            {
                node.parentNode.parentNode.parentNode.parentNode.style.display = "none";
                itemsRemoved++;
            }
        }

        if (UIL.Config.getKillQuotes())
        {
            // Get a list of quote headers
            var nodes =
                document.evaluate(
                    "//div[@class='quotetop']",
                    document,
                    null,
                    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                    null);

            // Remove posts containing quotes from ignored usernames
            for (var i = 0; i < nodes.snapshotLength; i++)
            {
                var node = nodes.snapshotItem(i);
                for (var j = 0; j < ignoredUsers.length; j++)
                {
                    if (node.innerHTML.indexOf("QUOTE(" + ignoredUsers[j]) === 0)
                    {
                        var postNode = node.parentNode.parentNode.parentNode.parentNode;
                        if (postNode.style.display != "none")
                        {
                            postNode.style.display = "none";
                            itemsRemoved++;
                        }
                        break;
                    }
                }
            }
        }

        return itemsRemoved;
    },

    getTopicIdFromCurrentPage: function()
    {
        return document.forms.namedItem("REPLIER").elements.namedItem("t").value;
    },

    postEditPreviewPageProcessor: function()
    {
        var itemsRemoved = 0;
        var topicId = this.getTopicIdFromCurrentPage();
        var ignoredUsers =
            UIL.Config.getGloballyIgnoredUsers()
                .concat(UIL.Config.getIgnoredUsersForTopic(topicId));

        // Get a list of username links
        var nodes =
            document.evaluate(
                "//div[@class='borderwrap']/table/tbody/tr/td[1]/b",
                document,
                null,
                XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                null);

        // Remove posts made by ignored usernames
        for (var i = 0; i < nodes.snapshotLength; i++)
        {
            var node = nodes.snapshotItem(i);
            if (ignoredUsers.indexOf(node.innerHTML) != -1)
            {
                // Remove name and date info
                var nameNode = node.parentNode.parentNode;
                nameNode.style.display = "none";
                // Move to next TR and remove post info
                var postNode = nameNode.nextSibling;
                while (postNode.nodeName != "TR" && postNode != null)
                {
                    postNode = postNode.nextSibling;
                }
                postNode.style.display = "none";
                itemsRemoved++;
            }
        }

        if (UIL.Config.getKillQuotes())
        {
            // Get a list of quote headers
            var nodes =
                document.evaluate(
                    "//div[@class='quotetop']",
                    document,
                    null,
                    XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                    null);

            // Remove posts containing quotes from ignored usernames
            for (var i = 0; i < nodes.snapshotLength; i++)
            {
                var node = nodes.snapshotItem(i);
                for (var j = 0; j < ignoredUsers.length; j++)
                {
                    if (node.innerHTML.indexOf("QUOTE(" + ignoredUsers[j]) === 0)
                    {
                        // Remove name and date info
                        var nameNode = node.parentNode.parentNode.parentNode;
                        nameNode.style.display = "none";
                        // Move to next TR and remove post info
                        var postNode = nameNode.nextSibling;
                        while (postNode.nodeName != "TR" && postNode != null)
                        {
                            postNode = postNode.nextSibling;
                        }
                        postNode.style.display = "none";
                        itemsRemoved++;
                        break;
                    }
                }
            }
        }

        return itemsRemoved;
    },

    topicListingPageProcessor: function()
    {
        if (!UIL.Config.getKillTopics())
        {
            return;
        }

        var itemsRemoved = 0;
        var ignoredUsers = UIL.Config.getGloballyIgnoredUsers();

        if (window.location.href.indexOf("searchid=") > -1)
        {
            var topicStarterXPathQuery =
                "//div[@class='borderwrap']/table/tbody/tr/td[5]/a[1]";
        }
        else
        {
            var topicStarterXPathQuery =
                "//table[@class='ipbtable']/tbody/tr/td[5]/a[1]";
        }

        var topicStarterLinkNodes =
            document.evaluate(
                topicStarterXPathQuery,
                document,
                null,
                XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                null);

        for (var i = 0; i < topicStarterLinkNodes.snapshotLength; i++)
        {
            var topicStarterLinkNode = topicStarterLinkNodes.snapshotItem(i);
            if (ignoredUsers.indexOf(topicStarterLinkNode.innerHTML) != -1)
            {
                var row = topicStarterLinkNode.parentNode.parentNode;
                row.parentNode.removeChild(row);
                itemsRemoved++;
            }
        }

        return itemsRemoved;
    },

    notifyOfItemRemoval: function(removedItemCount)
    {
        // Show the notification
        var s = document.createElement("DIV");
        s.id = "UIL-notification";
        s.style.position = "fixed";
        s.style.top = "0px";
        s.style.right = "0px";
        s.style.MozBorderRadiusBottomleft = "1em";
        s.style.backgroundColor = "red";
        s.style.color = "white";
        s.style.padding = "3px 6px 5px 8px";
        s.style.fontWeight = "bold";
        var r = removedItemCount + " item";
        if (removedItemCount > 1)
        {
            r += "s";
        }
        r += " removed";
        s.appendChild(document.createTextNode(r));
        document.body.appendChild(s);

        // Remove the notification later
        window.setTimeout(function()
        {
            var el = document.getElementById("UIL-notification");
            el.parentNode.removeChild(el);
        }, 3000);
    },

    addIgnoredUserForCurrentTopic: function()
    {
        var userName = prompt("User to be ignored in this topic:");
        if (userName)
        {
            if (UIL.Config.getGloballyIgnoredUsers().indexOf(userName) != -1)
            {
                alert("You're already ignoring " + userName + " globally");
                return;
            }

            var topicId = this.getTopicIdFromCurrentPage();
            var added = UIL.Config.addIgnoredUserForTopic(topicId, userName);
            if (!added)
            {
                alert("You're already ignoring " + username + " in this topic");
            }
        }
        unsafeWindow.menu_action_close();
    },

    registerControls: function(pageType)
    {
        var controls =
            document.getElementById("userlinks");
        if (controls)
        {
            controls = controls.getElementsByTagName("p")[1];
            controls.insertBefore(document.createTextNode(" . "), controls.firstChild);
            controls.insertBefore(this.createLinkControl("User Ignore List",
                                                        UIL.UI.show.bind(UIL.UI)),
                                  controls.firstChild);
        }

        if (pageType == "topic")
        {
            var menu = document.getElementById("topicmenu-options_menu");
            var insertPoint = menu.getElementsByTagName("div")[5];

            var item = document.createElement("div");
            item.className = "popupmenu-item";

            var img = document.createElement("img");
            img.border = 0;
            img.style.verticalAlign = "middle";
            img.alt = "V";
            img.src = "style_images/1/menu_item.gif";

            item.appendChild(img);
            item.appendChild(document.createTextNode(" "));
            item.appendChild(this.createLinkControl(
                "Ignore a user in this topic",
                this.addIgnoredUserForCurrentTopic.bind(this)));

            menu.insertBefore(item, insertPoint);
        }

        if (pageType == "ignoredUsers")
        {
            var container =
                document.evaluate(
                    "//input[@value='Update Ignored Users']",
                    document.getElementById("ucpcontent"),
                    null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE,
                    null).singleNodeValue.parentNode;

            var input = document.createElement("input");
            input.type = "button";
            input.className = "button";
            input.value = "Synchronise User Ignore List";
            input.addEventListener(
                "click",
                UIL.Config.importGloballyIgnoredUserList.bind(UIL.Config),
                false);

            container.appendChild(document.createTextNode(" "));
            container.appendChild(input);
        }
    },

    createLinkControl: function(name, handler)
    {
        var a = document.createElement("a");
        a.href = "#";
        a.appendChild(document.createTextNode(name));
        a.addEventListener("click", handler, false);
        return a;
    }
};

/**
 * Configuration.
 */
UIL.Config =
{
    getGloballyIgnoredUsers: function()
    {
        var ignoredUsers = [];
        var config = GM_getValue("globallyIgnoredUsers");
        if (config !== undefined && /^\[.*\]$/.test(config))
        {
            ignoredUsers = JSON.parse(config);
        }
        else
        {
            // Set up initial array, or reset if the config is invalid
            GM_setValue("globallyIgnoredUsers", "[]");
        }
        return ignoredUsers;
    },

    setGloballyIgnoredUsers: function(userNames)
    {
        GM_setValue("globallyIgnoredUsers", JSON.stringify(userNames));
    },

    addGloballyIgnoredUser: function(userName)
    {
        var added = false;
        var ignoredUsers = this.getGloballyIgnoredUsers();
        if (ignoredUsers.indexOf(userName) == -1)
        {
            ignoredUsers.push(userName);
            ignoredUsers.sort();
            this.setGloballyIgnoredUsers(ignoredUsers);
            added = true;
        }
        return added;
    },

    removeGloballyIgnoredUser: function(userName)
    {
        var ignoredUsers = this.getGloballyIgnoredUsers();
        ignoredUsers.splice(ignoredUsers.indexOf(userName), 1);
        this.setGloballyIgnoredUsers(ignoredUsers);
    },

    importGloballyIgnoredUserList: function()
    {
        // Get a list of username links
        var nodes =
            document.evaluate(
                "//div[@class='borderwrapm']/table/tbody/tr/td/b/a",
                document,
                null,
                XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                null);

        var ignoredUsers = [];
        for (var i = 0; i < nodes.snapshotLength; i++)
        {
            ignoredUsers.push(nodes.snapshotItem(i).innerHTML);
        }

        this.setGloballyIgnoredUsers(ignoredUsers);
        alert("Synchronised to Globally Ignored Users");
    },

    getPerTopicIgnoredUsers: function()
    {
        var topics = {};
        var config = GM_getValue("perTopicIgnoredUsers");
        if (config !== undefined && /^\{.*\}$/.test(config))
        {
            var topics = JSON.parse(config);
        }
        else
        {
            // Set up initial object, or reset if the config is invalid
            GM_setValue("perTopicIgnoredUsers", "{}");
        }
        return topics;
    },

    setPerTopicIgnoredUsers: function(topics)
    {
        GM_setValue("perTopicIgnoredUsers", JSON.stringify(topics));
    },

    addIgnoredUserForTopic: function(topicId, userName)
    {
        var added = false;
        var topics = this.getPerTopicIgnoredUsers();

        if (typeof(topics[topicId]) == "undefined")
        {
            topics[topicId] = [];
        }

        if (topics[topicId].indexOf(userName) == -1)
        {
            topics[topicId].push(userName);
            topics[topicId].sort();
            this.setPerTopicIgnoredUsers(topics);
            added = true;
        }
        return added;
    },

    getIgnoredUsersForTopic: function(topicId)
    {
        var ignoredUsers = [];
        var topics = this.getPerTopicIgnoredUsers();
        if (typeof(topics[topicId]) != "undefined")
        {
            ignoredUsers = topics[topicId];
        }
        return ignoredUsers;
    },

    removeIgnoredUserForTopic: function(topicId, userName)
    {
        var topics = this.getPerTopicIgnoredUsers();
        topics[topicId].splice(topics[topicId].indexOf(userName), 1);
        if (topics[topicId].length == 0)
        {
            delete(topics[topicId]);
        }
        this.setPerTopicIgnoredUsers(topics);
    },

    getNotification: function()
    {
        return this._getBooleanConfig("notification", true);
    },

    setNotification: function(notification)
    {
        GM_setValue("notification", notification);
    },

    getKillQuotes: function()
    {
        return this._getBooleanConfig("killQuotes", true);
    },

    setKillQuotes: function(killQuotes)
    {
        GM_setValue("killQuotes", killQuotes);
    },

    getKillTopics: function()
    {
        return this._getBooleanConfig("killTopics", false);
    },

    setKillTopics: function(killTopics)
    {
        GM_setValue("killTopics", killTopics);
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
UIL.UI =
{
    PREFS_HTML: "data:text/html;charset=utf-8;base64,PCFET0NUWVBFIGh0bWwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDQuMDEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvVFIvaHRtbDQvc3RyaWN0LmR0ZCI%2BDQo8aHRtbCBsYW5nPSJlbiI%2BDQo8aGVhZD4NCiAgPHRpdGxlPlVzZXJzY3JpcHQgUHJlZmVyZW5jZXM8L3RpdGxlPg0KICA8bWV0YSBodHRwLWVxdWl2PSJDb250ZW50LVR5cGUiIGNvbnRlbnQ9InRleHQvaHRtbDsgY2hhcnNldD1VVEYtOCI%2BDQogIDxtZXRhIG5hbWU9IkF1dGhvciIgY29udGVudD0iSm9uYXRoYW4gQnVjaGFuYW4iPg0KICA8bWV0YSBuYW1lPSJDb3B5cmlnaHQiIGNvbnRlbnQ9IiZjb3B5OyAyMDA2LCBKb25hdGhhbiBCdWNoYW5hbiI%2BDQogIDxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI%2BDQogIGJvZHkgeyBtYXJnaW46MDsgcGFkZGluZzowOyBmb250LXNpemU6MTJweDsgZm9udC1mYW1pbHk6Ikx1Y2lkYSBHcmFuZGUiLCJCaXRzdHJlYW0gVmVyYSBTYW5zIixWZXJkYW5hLEFyaWFsLHNhbnMtc2VyaWY7IGNvbG9yOiMzMzM7IHdpZHRoOiA1NTBweDsgbWFyZ2luOiAwIGF1dG87IH0NCiAgLm1vZHVsZSB7IGJvcmRlcjogMXB4IHNvbGlkICNjY2M7IG1hcmdpbi1ib3R0b206IDVweDsgYmFja2dyb3VuZC1jb2xvcjogI2ZmZjsgfQ0KICAubW9kdWxlIGgyLCAubW9kdWxlIGNhcHRpb24geyBtYXJnaW46IDA7IHBhZGRpbmc6IDJweCA1cHggM3B4IDVweDsgZm9udC1zaXplOiAxMXB4OyB0ZXh0LWFsaWduOiBsZWZ0OyBmb250LXdlaWdodDogYm9sZDsgYmFja2dyb3VuZDogIzdDQTBDNyB1cmwoImRhdGE6aW1hZ2UvZ2lmO2Jhc2U2NCxSMGxHT0RsaEVRQWZBT1lBQUx6UzZiREo0NCUyQncwWUdseXJ2UjZMVE01WWlxem42aXlJT255NENreWFHJTJCMjQydTBLSyUyQjI3alA1M3VneG9pcXpZYW96Snk2MkpxNDEzdWd4NHFzejUlMkI4MmFUQTNLN0g0b1NueTUlMkI4MnJiTjVyblE2S1RBM2FmQzNyTEw1SlMwMUtuRTM3Yk81biUyQmt5Wnk1Mkh5aHlLN0k0YkxLNUxqUDVyblE1NVcwMUtuRDM1ZTIxWDZqeUs3SDRaS3kwNnZHNFh5aXlJeXQwSlN6MUxISjQ0dXN6cGUxMW55aHg3clE1NWUyMXBHeDA2ZkIzb3Fzem4yaXg1S3gwcGUxMWFTJTJGM0lLbHlxekc0S2JDM3BxMzFydlI2YXpGNExYTTVZeXUwS3ZGNGJQSzQ1bTQxcWZDM2J2UzZIMmh4NnpHNFlLbXlyUEs1S3pGNFpXejFJeXV6NXE0MW9hcHpZQ2p5Wkt5MHFyRTM3Zk41cXJENEolMkI3MnBDdzBaR3kwb0dteW8lMkJ2MGJUTjViWE41Wm00MTUyNjJKeTYyWVdveklXcHpLckQzNGFvemJyUjZJJTJCdjByak81cmpPNTZmQjNhbkU0SVNteTdQTDVMZk81cCUyQjcyYmJONVlhcHpIdWh4cmZQNW55Z3g3ZlA1Nks5MjQlMkJ3MHJISjRxWEEzWXVyejM2anlZdXN6eUg1QkFBQUFBQUFMQUFBQUFBUkFCOEFBQWYlMkZnQUNDZzRTRmdnUUVURVJNaUloRUJHbVBqQVFiR3pjM0tDaVdtWlkzbFJzb2F3MmpkaWNuRGFlb3FIaHNEUm9ocjdBaFdWbHhjeHE0SWJCZ1JnVyUyQlliMWhCVVpndnNZbUhsQWVTY2pJSHM4bUpuQlFjQUVCTTliWTFudlcyZGdYTFMwbExSY2w1ZVBtNEJjWFJVRXZUa2hSN2U4dlFWRklMMFZJS201WUlDQXFBQXJVZ2lXZ2xqTkNkQ3pwMEtaRGg0VTZPdWdRSWtUaUVnNGNmbkN3WUNHakJUNGNOWExrb0lBQmc1SW9UU3BZZVRJUGd3b1pNbXlwQUZObUJwb1Y1TVNzTUdiRWlBZ1JmZ0lkUThZbkdhQVJKQ2hWTW9RS0ZhWkt4WWlSb0VUQ2tCb3JWdFR3c1FJSERoOCUyQmNHRDlxalhGQnhreVVwaVZjdmJEMmhReXFUNjQ2SkVqeDVVZWM3dTRzSnNqcndzQkFyZ0FEdnhGUUdFMUF2UU1qaEZqZ1dQSE1ZNGNlZHg0eWhFS21HblEyRUZCTTRVZGZTajglMkJiempnUUhUQmxJJTJGV0syYXRZRXlhQ0NZZ1VEYkRCMElWY3hVS1VNYkFnSU1DSUwlMkZmaE1jT0lianY1OEFHZUJsT2ZNbkE2STdqNTVBaElqcTFhOWJTWkJnTzNZZUxGZ2NHSDlBUFBueTRmM0FzTUdlUkJNU0pIakFhR0pEZmhNZUpPNDRtTERmUVIzJTJCRXdUWW53TU9CQUlBT3clM0QlM0QiKSB0b3AgbGVmdCByZXBlYXQteDsgY29sb3I6ICNmZmY7IGJvcmRlci1ib3R0b206IDA7IH0NCg0KICAuZm9ybS1yb3cgeyBvdmVyZmxvdzogaGlkZGVuOyBwYWRkaW5nOiA4cHggMTJweDsgZm9udC1zaXplOiAxMXB4OyBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2VlZTsgYm9yZGVyLXJpZ2h0OiAxcHggc29saWQgI2VlZTsgfQ0KICAuZm9ybS1yb3cgaW1nLCAuZm9ybS1yb3cgaW5wdXQgeyB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlOyB9DQogIC5mb3JtLWZpZWxkIHsgZmxvYXQ6IGxlZnQ7IH0NCiAgLmFsaWduZWQgbGFiZWwgeyBwYWRkaW5nOiAwIDFlbSAzcHggMDsgZmxvYXQ6IGxlZnQ7IHdpZHRoOiAxMGVtOyB9DQogIC5jaGVja2JveC1yb3cgbGFiZWwgeyBwYWRkaW5nOiAwOyBmbG9hdDogbm9uZTsgd2lkdGg6IGF1dG87IH0NCiAgcC5oZWxwIHsgY29sb3I6ICM5OTk7IGZvbnQtc2l6ZTogMTFweDsgfQ0KICAuc3VibWl0LXJvdyB7IHBhZGRpbmc6IDhweCAxMnB4OyB0ZXh0LWFsaWduOiByaWdodDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNlZWU7IGJvcmRlci1yaWdodDogMXB4IHNvbGlkICNlZWU7IH0NCg0KICB1bCB7IG1hcmdpbjogLjVlbSAwIDAgMDsgcGFkZGluZzogMCAwIDAgMmVtOyBsaW5lLWhlaWdodDogMS41ZW07IH0NCiAgbGkgeyBtYXJnaW46IDA7IHBhZGRpbmc6IDA7IH0NCg0KICBzcGFuLmNvbnRyb2wgeyB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTsgY3Vyc29yOiBwb2ludGVyOyBjb2xvcjogIzAwZjsgfQ0KICA8L3N0eWxlPg0KPC9oZWFkPg0KPGJvZHk%2BDQoNCjxmb3JtIG5hbWU9InByZWZlcmVuY2VzIiBpZD0icHJlZmVyZW5jZXMiIGNsYXNzPSJhbGlnbmVkIj4NCiAgPGRpdiBjbGFzcz0ibW9kdWxlIj4NCiAgICA8aDI%2BVXNlciBJZ25vcmUgTGlzdCBQcmVmZXJlbmNlczwvaDI%2BDQogICAgPGRpdiBjbGFzcz0iZm9ybS1yb3ciPg0KICAgICAgPGxhYmVsPkdsb2JhbGx5IElnbm9yZWQgVXNlcnM6PC9sYWJlbD4NCiAgICAgIDxkaXYgY2xhc3M9ImZvcm0tZmllbGQiPg0KICAgICAgICA8aW5wdXQgdHlwZT0idGV4dCIgbmFtZT0iaWdub3JlX3VzZXIiPiA8aW5wdXQgdHlwZT0iYnV0dG9uIiB2YWx1ZT0iQWRkIiBpZD0iaWdub3JlX3VzZXJfYnV0dG9uIiBuYW1lPSJpZ25vcmVfdXNlcl9idXR0b24iPg0KICAgICAgICA8dWwgaWQ9Imlnbm9yZWRfdXNlcnMiPg0KICAgICAgICA8L3VsPg0KICAgICAgPC9kaXY%2BDQogICAgPC9kaXY%2BDQogICAgPGRpdiBjbGFzcz0iZm9ybS1yb3ciPg0KICAgICAgPGxhYmVsPlBlci1Ub3BpYyBJZ25vcmVkIFVzZXJzOjwvbGFiZWw%2BDQogICAgICA8ZGl2IGNsYXNzPSJmb3JtLWZpZWxkIj4NCiAgICAgICAgPGlucHV0IHR5cGU9InRleHQiIG5hbWU9InRvcGljX2lnbm9yZV91c2VyIj4gaW4gPGlucHV0IHR5cGU9InRleHQiIG5hbWU9InRvcGljX2lnbm9yZSI%2BIDxpbnB1dCB0eXBlPSJidXR0b24iIHZhbHVlPSJBZGQiIGlkPSJ0b3BpY19pZ25vcmVfdXNlcl9idXR0b24iIG5hbWU9InRvcGljX2lnbm9yZV91c2VyX2J1dHRvbiI%2BDQogICAgICAgIDxwIGNsYXNzPSJoZWxwIj5Vc2UgdG9waWMgaWRzIGZvciB0aGUgImluIiBmaWVsZCwgZS5nLiBTdGV2ZSBpbiAxMjM0NTY8L3A%2BDQogICAgICAgIDxkbCBpZD0idG9waWNfaWdub3JlZF91c2VycyI%2BDQogICAgICAgIDwvZGw%2BDQogICAgICA8L2Rpdj4NCiAgICA8L2Rpdj4NCiAgICA8ZGl2IGNsYXNzPSJmb3JtLXJvdyBjaGVja2JveC1yb3ciPg0KICAgICAgPGxhYmVsIGZvcj0ia2lsbF9xdW90ZXMiPjxpbnB1dCB0eXBlPSJjaGVja2JveCIgbmFtZT0ia2lsbF9xdW90ZXMiIGlkPSJraWxsX3F1b3RlcyI%2BIFJlbW92ZSBwb3N0cyB3aGljaCBxdW90ZSBpZ25vcmVkIHVzZXJzPC9sYWJlbD4NCiAgICA8L2Rpdj4NCiAgICA8ZGl2IGNsYXNzPSJmb3JtLXJvdyBjaGVja2JveC1yb3ciPg0KICAgICAgPGxhYmVsIGZvcj0ibm90aWZ5Ij48aW5wdXQgdHlwZT0iY2hlY2tib3giIG5hbWU9Im5vdGlmeSIgaWQ9Im5vdGlmeSI%2BIERpc3BsYXkgbm90aWZpY2F0aW9uIHdoZW4gcG9zdHMgb3IgdG9waWNzIGFyZSByZW1vdmVkPC9sYWJlbD4NCiAgICA8L2Rpdj4NCiAgICA8ZGl2IGNsYXNzPSJmb3JtLXJvdyBjaGVja2JveC1yb3ciPg0KICAgICAgPGxhYmVsIGZvcj0ia2lsbF90b3BpY3MiPjxpbnB1dCB0eXBlPSJjaGVja2JveCIgbmFtZT0ia2lsbF90b3BpY3MiIGlkPSJraWxsX3RvcGljcyI%2BIFJlbW92ZSB0b3BpY3MgY3JlYXRlZCBieSBnbG9iYWxseSBpZ25vcmVkIHVzZXJzPC9sYWJlbD4NCiAgICA8L2Rpdj4NCiAgPC9kaXY%2BDQoNCiAgPGRpdiBjbGFzcz0ibW9kdWxlIj4NCiAgICA8ZGl2IGNsYXNzPSJzdWJtaXQtcm93Ij4NCiAgICAgIDxpbnB1dCB0eXBlPSJidXR0b24iIHZhbHVlPSJDbG9zZSIgbmFtZT0iY2xvc2VfYnV0dG9uIiBpZD0iY2xvc2VfYnV0dG9uIj4NCiAgICAgIDxpbnB1dCB0eXBlPSJidXR0b24iIHZhbHVlPSJTYXZlIFByZWZlcmVuY2VzIiBuYW1lPSJzYXZlX2J1dHRvbiIgaWQ9InNhdmVfYnV0dG9uIj4NCiAgICA8L2Rpdj4NCiAgPC9kaXY%2BDQo8L2Zvcm0%2BDQoNCjwvYm9keT4NCjwvaHRtbD4%3D",

    show: function(e)
    {
        if (e)
        {
            e.preventDefault();
            e.stopPropagation();
        }

        var blocker = document.createElement("div");
        this.blocker = blocker;
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
        prefs.addEventListener("load", this.preferenceDocumentLoadHandler.bind(this), false);
        this.prefs = prefs;

        document.body.appendChild(prefs);

        prefs.id = "uil_preferences";
        prefs.name = "uil_preferences";
        prefs.style.position = "fixed";
        prefs.style.top = "1em";
        prefs.style.left = "0px";
        prefs.style.right = "0px";
        prefs.style.border = "none";
        prefs.style.height = "100%";
        prefs.style.overflow = "hidden";
        prefs.src = this.PREFS_HTML;
    },

    hide: function()
    {
        document.body.removeChild(this.prefs);
        document.body.removeChild(this.blocker);
        this.prefs = null;
        this.blocker = null;
    },

    preferenceDocumentLoadHandler: function()
    {
        var form = this.prefs.contentDocument.forms.namedItem("preferences");

        // Set up form state
        this.populateGloballyIgnoredUserList();
        this.populatePerTopicIgnoredUserList();
        form.elements.namedItem("kill_quotes").checked = UIL.Config.getKillQuotes();
        form.elements.namedItem("notify").checked = UIL.Config.getNotification();
        form.elements.namedItem("kill_topics").checked = UIL.Config.getKillTopics();

        // Set up event handlers
        form.elements.namedItem("close_button").addEventListener("click", this.hide.bind(this), false);
        form.elements.namedItem("save_button").addEventListener("click", this.saveConfigurationHandler.bind(this), false);
        form.elements.namedItem("ignore_user_button").addEventListener("click", this.addGloballyIgnoredUserHandler.bind(this), false);
        form.elements.namedItem("topic_ignore_user_button").addEventListener("click", this.addPerTopicIgnoredUserHandler.bind(this), false);
    },

    saveConfigurationHandler: function()
    {
        var form = this.prefs.contentDocument.forms.namedItem("preferences");
        UIL.Config.setKillQuotes(form.elements.namedItem("kill_quotes").checked);
        UIL.Config.setNotification(form.elements.namedItem("notify").checked);
        UIL.Config.setKillTopics(form.elements.namedItem("kill_topics").checked);
        this.hide();
    },

    addGloballyIgnoredUserHandler: function()
    {
        var form = this.prefs.contentDocument.forms.namedItem("preferences");
        var ignoredUser = form.elements.namedItem("ignore_user");
        var userName = ignoredUser.value;
        if (userName.length > 0)
        {
            var added = UIL.Config.addGloballyIgnoredUser(userName);
            if (added)
            {
                ignoredUser.value = "";
                this.populateGloballyIgnoredUserList();
            }
            else
            {
                alert("You're already ignoring " + userName);
            }
        }
    },

    addPerTopicIgnoredUserHandler: function()
    {
        var form = this.prefs.contentDocument.forms.namedItem("preferences");
        var ignoredUser = form.elements.namedItem("topic_ignore_user");
        var ignoredTopic = form.elements.namedItem("topic_ignore");
        var userName = ignoredUser.value;
        var topicId = ignoredTopic.value;
        if (userName.length > 0 && topicId.length > 0)
        {
            if (UIL.Config.getGloballyIgnoredUsers().indexOf(userName) != -1)
            {
                alert("You're already ignoring " + userName + " globally");
                return;
            }

            var added = UIL.Config.addIgnoredUserForTopic(topicId, userName);
            if (added)
            {
                this.populatePerTopicIgnoredUserList();
                ignoredUser.value = "";
                ignoredTopic.value = "";
            }
            else
            {
                alert("You're already ignoring " + userName + " in topic " + topicId);
            }
        }
    },

    createGloballyUnignoreUserHandler: function(userName)
    {
        return function()
        {
            if (confirm("Are you sure you want to unignore " + userName + "?"))
            {
                UIL.Config.removeGloballyIgnoredUser(userName);
                this.populateGloballyIgnoredUserList();
            }
        }.bind(this);
    },

    createPerTopicUnignoreUserHandler: function(userName, topicId)
    {
        return function()
        {
            if (confirm("Are you sure you want to unignore " + userName + " in topic " + topicId + "?"))
            {
                UIL.Config.removeIgnoredUserForTopic(topicId, userName);
                this.populatePerTopicIgnoredUserList();
            }
        }.bind(this);
    },

    populateGloballyIgnoredUserList: function()
    {
        var document = this.prefs.contentDocument;
        var list = document.getElementById("ignored_users");
        while (list.firstChild)
        {
            list.removeChild(list.firstChild);
        }
        UIL.Config.getGloballyIgnoredUsers().forEach(function(userName)
        {
            var li = document.createElement("li");

            var span = document.createElement("span");
            span.appendChild(document.createTextNode("Unignore"));
            span.className = "control";
            span.addEventListener("click", this.createGloballyUnignoreUserHandler(userName), false);

            li.appendChild(document.createTextNode(userName + " ("));
            li.appendChild(span);
            li.appendChild(document.createTextNode(")"));
            list.appendChild(li);
        }.bind(this));
    },

    populatePerTopicIgnoredUserList: function()
    {
        var document = this.prefs.contentDocument;
        var list = document.getElementById("topic_ignored_users");
        while (list.firstChild)
        {
            list.removeChild(list.firstChild);
        }
        var topics = UIL.Config.getPerTopicIgnoredUsers()
        for (topicId in topics)
        {
            if (topics.hasOwnProperty(topicId))
            {
                var dt = document.createElement("dt");
                var a = document.createElement("a");
                a.href = "http://www.rllmukforum.com/index.php?showtopic=" + topicId;
                a.target = "_blank";
                a.appendChild(document.createTextNode(topicId));
                dt.appendChild(a);
                list.appendChild(dt);

                topics[topicId].forEach(function(userName)
                {
                    var dd = document.createElement("dd");

                    var span = document.createElement("span");
                    span.appendChild(document.createTextNode("Unignore"));
                    span.className = "control";
                    span.addEventListener("click", this.createPerTopicUnignoreUserHandler(userName, topicId), false);

                    dd.appendChild(document.createTextNode(userName + " ("));
                    dd.appendChild(span);
                    dd.appendChild(document.createTextNode(")"));
                    list.appendChild(dd);
                }.bind(this));
            }
        }
    }
};

UIL.init();