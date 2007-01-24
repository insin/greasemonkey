// ==UserScript==
// @name        Rllmuk User Ignore List
// @namespace   http://www.jonathanbuchanan.plus.com/repos/greasemonkey/
// @description Implements a user ignore list which removes all traces of the users on the list and optionally removes topics created by ignored users and posts which quote ignored users. The ignore list can be synchronised with your Manage Ignored Users settings when viewing that page.
// @include     http://www.rllmukforum.com/*
// @include     http://rllmukforum.com/*
// @include     http://www.rpsoft.co.uk/*
// @include     http://rpsoft.co.uk/*
// ==/UserScript==

/* Changelog
 * ---------
 * 2007-01-24 Added ignoring of specific users only in specific topics.
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

/* Utility Methods
------------------------------------------------------------------------- */
String.prototype.endsWith = function(s)
{
    lastIndex = this.lastIndexOf(s);
    return (lastIndex != -1 && lastIndex == (this.length - s.length));
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

var UIL =
{
};

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
    }
};

/* Configuration
 ------------------------------------------------------------------------ */
var UIL_notification = GM_getValue("notification");
if (UIL_notification === undefined)
{
    GM_setValue("notification", true);
    UIL_notification = true;
}
var UIL_killQuotes = GM_getValue("killQuotes");
if (UIL_killQuotes === undefined)
{
    GM_setValue("killQuotes", true);
    UIL_killQuotes = true;
}
var UIL_killTopics = GM_getValue("killTopics");
if (UIL_killTopics === undefined)
{
    GM_setValue("killTopics", false);
    UIL_killTopics = false;
}

var UIL_postsRemoved = 0;
var ignoredUsers = UIL.Config.getGloballyIgnoredUsers();

/* Post Removal And Notification
------------------------------------------------------------------------- */
// Remove posts from topic pages
if (window.location.href.toLowerCase().indexOf("showtopic=") != -1 ||
    window.location.href.indexOf("act=ST") != -1)
{
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
            UIL_postsRemoved++;
        }
    }

    if (UIL_killQuotes)
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
                        UIL_postsRemoved++;
                    }
                    break;
                }
            }
        }
    }
}

// Remove posts from post/edit/preview topic summary
if (window.location.href.toLowerCase().indexOf("act=post") != -1 ||
    window.location.href.endsWith("/index.php?"))
{
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
            // Increment counter
            UIL_postsRemoved++;
        }
    }

    if (UIL_killQuotes)
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
                    // Increment counter
                    UIL_postsRemoved++;
                    break;
                }
            }
        }
    }
}

// Remove topics from topic pages
if (UIL_killTopics &&
    (window.location.href.indexOf("showforum=") != -1 ||
     window.location.href.indexOf("act=SF") != -1 ||
     window.location.href.indexOf("searchid=") != -1))
{
    if (window.location.href.indexOf("searchid=") > -1)
    {
        topicStarterXPathQuery =
            "//div[@class='borderwrap']/table/tbody/tr/td[5]/a[1]";
    }
    else
    {
        topicStarterXPathQuery =
            "//table[@class='ipbtable']/tbody/tr/td[5]/a[1]";
    }

    var topicStarterLinkNodes =
        document.evaluate(topicStarterXPathQuery, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0; i < topicStarterLinkNodes.snapshotLength; i++)
    {
        var topicStarterLinkNode = topicStarterLinkNodes.snapshotItem(i);
        if (ignoredUsers.indexOf(topicStarterLinkNode.innerHTML) != -1)
        {
            var row = topicStarterLinkNode.parentNode.parentNode;
            row.parentNode.removeChild(row);
            UIL_postsRemoved++;
        }
    }
}

// Display information about number of posts removed
if (UIL_notification && UIL_postsRemoved > 0)
{
    // Create an element to contain the information
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
    var r = UIL_postsRemoved + " post";
    if (UIL_postsRemoved > 1) r += "s";
    r += " removed";
    s.appendChild(document.createTextNode(r));
    document.body.appendChild(s);

    // Set up a function to remove the information
    function removeUILStatus()
    {
        var st = document.getElementById("UIL-notification");
        st.parentNode.removeChild(st);
    }
    window.setTimeout(removeUILStatus, 2500);
}

/* Menu Commands
------------------------------------------------------------------------- */
var PREFS_HTML = "data:text/html;charset=utf-8;base64,PCFET0NUWVBFIGh0bWwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDQuMDEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvVFIvaHRtbDQvc3RyaWN0LmR0ZCI%2BDQo8aHRtbCBsYW5nPSJlbiI%2BDQo8aGVhZD4NCiAgPHRpdGxlPlVzZXJzY3JpcHQgUHJlZmVyZW5jZXM8L3RpdGxlPg0KICA8bWV0YSBodHRwLWVxdWl2PSJDb250ZW50LVR5cGUiIGNvbnRlbnQ9InRleHQvaHRtbDsgY2hhcnNldD1VVEYtOCI%2BDQogIDxtZXRhIG5hbWU9IkF1dGhvciIgY29udGVudD0iSm9uYXRoYW4gQnVjaGFuYW4iPg0KICA8bWV0YSBuYW1lPSJDb3B5cmlnaHQiIGNvbnRlbnQ9IiZjb3B5OyAyMDA2LCBKb25hdGhhbiBCdWNoYW5hbiI%2BDQogIDxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI%2BDQogIGJvZHkgeyBtYXJnaW46MDsgcGFkZGluZzowOyBmb250LXNpemU6MTJweDsgZm9udC1mYW1pbHk6Ikx1Y2lkYSBHcmFuZGUiLCJCaXRzdHJlYW0gVmVyYSBTYW5zIixWZXJkYW5hLEFyaWFsLHNhbnMtc2VyaWY7IGNvbG9yOiMzMzM7IHdpZHRoOiA1MDBweDsgbWFyZ2luOiAwIGF1dG87IH0NCiAgLm1vZHVsZSB7IGJvcmRlcjogMXB4IHNvbGlkICNjY2M7IG1hcmdpbi1ib3R0b206IDVweDsgYmFja2dyb3VuZC1jb2xvcjogI2ZmZjsgfQ0KICAubW9kdWxlIGgyLCAubW9kdWxlIGNhcHRpb24geyBtYXJnaW46IDA7IHBhZGRpbmc6IDJweCA1cHggM3B4IDVweDsgZm9udC1zaXplOiAxMXB4OyB0ZXh0LWFsaWduOiBsZWZ0OyBmb250LXdlaWdodDogYm9sZDsgYmFja2dyb3VuZDogIzdDQTBDNyB1cmwoImRhdGE6aW1hZ2UvZ2lmO2Jhc2U2NCxSMGxHT0RsaEVRQWZBT1lBQUx6UzZiREo0NCUyQncwWUdseXJ2UjZMVE01WWlxem42aXlJT255NENreWFHJTJCMjQydTBLSyUyQjI3alA1M3VneG9pcXpZYW96Snk2MkpxNDEzdWd4NHFzejUlMkI4MmFUQTNLN0g0b1NueTUlMkI4MnJiTjVyblE2S1RBM2FmQzNyTEw1SlMwMUtuRTM3Yk81biUyQmt5Wnk1Mkh5aHlLN0k0YkxLNUxqUDVyblE1NVcwMUtuRDM1ZTIxWDZqeUs3SDRaS3kwNnZHNFh5aXlJeXQwSlN6MUxISjQ0dXN6cGUxMW55aHg3clE1NWUyMXBHeDA2ZkIzb3Fzem4yaXg1S3gwcGUxMWFTJTJGM0lLbHlxekc0S2JDM3BxMzFydlI2YXpGNExYTTVZeXUwS3ZGNGJQSzQ1bTQxcWZDM2J2UzZIMmh4NnpHNFlLbXlyUEs1S3pGNFpXejFJeXV6NXE0MW9hcHpZQ2p5Wkt5MHFyRTM3Zk41cXJENEolMkI3MnBDdzBaR3kwb0dteW8lMkJ2MGJUTjViWE41Wm00MTUyNjJKeTYyWVdveklXcHpLckQzNGFvemJyUjZJJTJCdjByak81cmpPNTZmQjNhbkU0SVNteTdQTDVMZk81cCUyQjcyYmJONVlhcHpIdWh4cmZQNW55Z3g3ZlA1Nks5MjQlMkJ3MHJISjRxWEEzWXVyejM2anlZdXN6eUg1QkFBQUFBQUFMQUFBQUFBUkFCOEFBQWYlMkZnQUNDZzRTRmdnUUVURVJNaUloRUJHbVBqQVFiR3pjM0tDaVdtWlkzbFJzb2F3MmpkaWNuRGFlb3FIaHNEUm9ocjdBaFdWbHhjeHE0SWJCZ1JnVyUyQlliMWhCVVpndnNZbUhsQWVTY2pJSHM4bUpuQlFjQUVCTTliWTFudlcyZGdYTFMwbExSY2w1ZVBtNEJjWFJVRXZUa2hSN2U4dlFWRklMMFZJS201WUlDQXFBQXJVZ2lXZ2xqTkNkQ3pwMEtaRGg0VTZPdWdRSWtUaUVnNGNmbkN3WUNHakJUNGNOWExrb0lBQmc1SW9UU3BZZVRJUGd3b1pNbXlwQUZObUJwb1Y1TVNzTUdiRWlBZ1JmZ0lkUThZbkdhQVJKQ2hWTW9RS0ZhWkt4WWlSb0VUQ2tCb3JWdFR3c1FJSERoOCUyQmNHRDlxalhGQnhreVVwaVZjdmJEMmhReXFUNjQ2SkVqeDVVZWM3dTRzSnNqcndzQkFyZ0FEdnhGUUdFMUF2UU1qaEZqZ1dQSE1ZNGNlZHg0eWhFS21HblEyRUZCTTRVZGZTajglMkJiempnUUhUQmxJJTJGV0syYXRZRXlhQ0NZZ1VEYkRCMElWY3hVS1VNYkFnSU1DSUwlMkZmaE1jT0lianY1OEFHZUJsT2ZNbkE2STdqNTVBaElqcTFhOWJTWkJnTzNZZUxGZ2NHSDlBUFBueTRmM0FzTUdlUkJNU0pIakFhR0pEZmhNZUpPNDRtTERmUVIzJTJCRXdUWW53TU9CQUlBT3clM0QlM0QiKSB0b3AgbGVmdCByZXBlYXQteDsgY29sb3I6ICNmZmY7IGJvcmRlci1ib3R0b206IDA7IH0NCg0KICAuZm9ybS1yb3cgeyBvdmVyZmxvdzogaGlkZGVuOyBwYWRkaW5nOiA4cHggMTJweDsgZm9udC1zaXplOiAxMXB4OyBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2VlZTsgYm9yZGVyLXJpZ2h0OiAxcHggc29saWQgI2VlZTsgfQ0KICAuZm9ybS1yb3cgaW1nLCAuZm9ybS1yb3cgaW5wdXQgeyB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlOyB9DQogIC5mb3JtLWZpZWxkIHsgZmxvYXQ6IGxlZnQ7IH0NCiAgLmFsaWduZWQgbGFiZWwgeyBwYWRkaW5nOiAwIDFlbSAzcHggMDsgZmxvYXQ6IGxlZnQ7IHdpZHRoOiA4ZW07IH0NCiAgLmNoZWNrYm94LXJvdyBsYWJlbCB7IHBhZGRpbmc6IDA7IGZsb2F0OiBub25lOyB3aWR0aDogYXV0bzsgfQ0KICAuc3VibWl0LXJvdyB7IHBhZGRpbmc6IDhweCAxMnB4OyB0ZXh0LWFsaWduOiByaWdodDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNlZWU7IGJvcmRlci1yaWdodDogMXB4IHNvbGlkICNlZWU7IH0NCg0KICB1bCB7IG1hcmdpbjogLjVlbSAwIDAgMDsgcGFkZGluZzogMCAwIDAgMmVtOyBsaW5lLWhlaWdodDogMS41ZW07IH0NCiAgbGkgeyBtYXJnaW46IDA7IHBhZGRpbmc6IDA7IH0NCg0KICBzcGFuLmNvbnRyb2wgeyB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTsgY3Vyc29yOiBwb2ludGVyOyBjb2xvcjogIzAwZjsgfQ0KICA8L3N0eWxlPg0KPC9oZWFkPg0KPGJvZHk%2BDQoNCjxmb3JtIG5hbWU9InByZWZlcmVuY2VzIiBpZD0icHJlZmVyZW5jZXMiIGNsYXNzPSJhbGlnbmVkIj4NCiAgPGRpdiBjbGFzcz0ibW9kdWxlIj4NCiAgICA8aDI%2BVXNlciBJZ25vcmUgTGlzdCBQcmVmZXJlbmNlczwvaDI%2BDQogICAgPGRpdiBjbGFzcz0iZm9ybS1yb3ciPg0KICAgICAgPGxhYmVsPkdsb2JhbGx5IElnbm9yZWQgVXNlcnM6PC9sYWJlbD4NCiAgICAgIDxkaXYgY2xhc3M9ImZvcm0tZmllbGQiPg0KICAgICAgICA8aW5wdXQgdHlwZT0idGV4dCIgbmFtZT0iaWdub3JlX3VzZXIiPiA8aW5wdXQgdHlwZT0iYnV0dG9uIiB2YWx1ZT0iQWRkIiBpZD0iaWdub3JlX3VzZXJfYnV0dG9uIiBuYW1lPSJpZ25vcmVfdXNlcl9idXR0b24iPg0KICAgICAgICA8dWwgaWQ9Imlnbm9yZWRfdXNlcnMiPg0KICAgICAgICA8L3VsPg0KICAgICAgPC9kaXY%2BDQogICAgPC9kaXY%2BDQogICAgPGRpdiBjbGFzcz0iZm9ybS1yb3ciPg0KICAgICAgPGxhYmVsPlBlci1Ub3BpYyBJZ25vcmVkIFVzZXJzOjwvbGFiZWw%2BDQogICAgICA8ZGl2IGNsYXNzPSJmb3JtLWZpZWxkIj4NCiAgICAgICAgPGlucHV0IHR5cGU9InRleHQiIG5hbWU9InRvcGljX2lnbm9yZV91c2VyIj4gaW4gPGlucHV0IHR5cGU9InRleHQiIG5hbWU9InRvcGljX2lnbm9yZSI%2BIDxpbnB1dCB0eXBlPSJidXR0b24iIHZhbHVlPSJBZGQiIGlkPSJ0b3BpY19pZ25vcmVfdXNlcl9idXR0b24iIG5hbWU9InRvcGljX2lnbm9yZV91c2VyX2J1dHRvbiI%2BDQogICAgICAgIDxkbCBpZD0idG9waWNfaWdub3JlZF91c2VycyI%2BDQogICAgICAgIDwvZGw%2BDQogICAgICA8L2Rpdj4NCiAgICA8L2Rpdj4NCiAgICA8ZGl2IGNsYXNzPSJmb3JtLXJvdyBjaGVja2JveC1yb3ciPg0KICAgICAgPGxhYmVsIGZvcj0ia2lsbF9xdW90ZXMiPjxpbnB1dCB0eXBlPSJjaGVja2JveCIgbmFtZT0ia2lsbF9xdW90ZXMiIGlkPSJraWxsX3F1b3RlcyI%2BIFJlbW92ZSBwb3N0cyB3aGljaCBxdW90ZSBpZ25vcmVkIHVzZXJzPC9sYWJlbD4NCiAgICA8L2Rpdj4NCiAgICA8ZGl2IGNsYXNzPSJmb3JtLXJvdyBjaGVja2JveC1yb3ciPg0KICAgICAgPGxhYmVsIGZvcj0ibm90aWZ5Ij48aW5wdXQgdHlwZT0iY2hlY2tib3giIG5hbWU9Im5vdGlmeSIgaWQ9Im5vdGlmeSI%2BIERpc3BsYXkgbm90aWZpY2F0aW9uIHdoZW4gcG9zdHMgYXJlIHJlbW92ZWQ8L2xhYmVsPg0KICAgIDwvZGl2Pg0KICAgIDxkaXYgY2xhc3M9ImZvcm0tcm93IGNoZWNrYm94LXJvdyI%2BDQogICAgICA8bGFiZWwgZm9yPSJraWxsX3RvcGljcyI%2BPGlucHV0IHR5cGU9ImNoZWNrYm94IiBuYW1lPSJraWxsX3RvcGljcyIgaWQ9ImtpbGxfdG9waWNzIj4gUmVtb3ZlIHRvcGljcyBjcmVhdGVkIGJ5IGlnbm9yZWQgdXNlcnM8L2xhYmVsPg0KICAgIDwvZGl2Pg0KICA8L2Rpdj4NCg0KICA8ZGl2IGNsYXNzPSJtb2R1bGUiPg0KICAgIDxkaXYgY2xhc3M9InN1Ym1pdC1yb3ciPg0KICAgICAgPGlucHV0IHR5cGU9ImJ1dHRvbiIgdmFsdWU9IkNsb3NlIiBuYW1lPSJjbG9zZV9idXR0b24iIGlkPSJjbG9zZV9idXR0b24iPg0KICAgICAgPGlucHV0IHR5cGU9ImJ1dHRvbiIgdmFsdWU9IlNhdmUgUHJlZmVyZW5jZXMiIG5hbWU9InNhdmVfYnV0dG9uIiBpZD0ic2F2ZV9idXR0b24iPg0KICAgIDwvZGl2Pg0KICA8L2Rpdj4NCjwvZm9ybT4NCg0KPC9ib2R5Pg0KPC9odG1sPg%3D%3D";

GM_registerMenuCommand("User Ignore List Preferences", function()
{
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

    function addGloballyIgnoredUser()
    {
        var form = prefs.contentDocument.forms.namedItem("preferences");
        var ignoredUser = form.elements.namedItem("ignore_user");
        var userName = ignoredUser.value;
        if (userName.length > 0)
        {
            var added = UIL.Config.addGloballyIgnoredUser(userName);
            if (added)
            {
                ignoredUser.value = "";
                createIgnoredUserList();
            }
            else
            {
                alert("You're already ignoring " + userName);
            }
        }
    }

    function addPerTopicIgnoredUser()
    {
        var form = prefs.contentDocument.forms.namedItem("preferences");
        var ignoredUser = form.elements.namedItem("topic_ignore_user");
        var ignoredTopic = form.elements.namedItem("topic_ignore");
        var userName = ignoredUser.value;
        var topicId = ignoredTopic.value;
        if (userName.length > 0 && topicId.length > 0)
        {
            var added = UIL.Config.addIgnoredUserForTopic(topicId, userName);
            if (added)
            {
                createTopicIgnoredUserList();
                ignoredUser.value = "";
                ignoredTopic.value = "";
            }
            else
            {
                alert("You're already ignoring " + userName + " in topic " + topicId);
            }
        }
    }

    function unignoreUser(userName)
    {
        return function()
        {
            if (confirm("Are you sure you want to unignore " + userName + "?"))
            {
                UIL.Config.removeGloballyIgnoredUser(userName);
                createIgnoredUserList();
            }
        };
    }

    function unignoreTopicUser(userName, topicId)
    {
        return function()
        {
            if (confirm("Are you sure you want to unignore " + userName + " in topic " + topicId + "?"))
            {
                UIL.Config.removeIgnoredUserForTopic(topicId, userName);
                createTopicIgnoredUserList();
            }
        };
    }

    function createIgnoredUserList()
    {
        var document = prefs.contentDocument;
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
            span.addEventListener("click", unignoreUser(userName), false);

            li.appendChild(document.createTextNode(userName + " ("));
            li.appendChild(span);
            li.appendChild(document.createTextNode(")"));
            list.appendChild(li);
        });
    }

    function createTopicIgnoredUserList()
    {
        var document = prefs.contentDocument;
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
                    span.addEventListener("click", unignoreTopicUser(userName, topicId), false);

                    dd.appendChild(document.createTextNode(userName + " ("));
                    dd.appendChild(span);
                    dd.appendChild(document.createTextNode(")"));
                    list.appendChild(dd);
                });
            }
        }
    }

    var prefs = document.createElement("iframe");

    prefs.addEventListener("load", function()
    {
        var form = prefs.contentDocument.forms.namedItem("preferences");
        if (form)
        {
            createIgnoredUserList();
            createTopicIgnoredUserList();

            form.elements.namedItem("kill_quotes").checked = GM_getValue("killQuotes");
            form.elements.namedItem("notify").checked = GM_getValue("notification");
            form.elements.namedItem("kill_topics").checked = GM_getValue("killTopics");
            form.elements.namedItem("close_button").addEventListener("click", function()
            {
                unsafeWindow.top.document.body.removeChild(prefs);
                unsafeWindow.top.document.body.removeChild(blocker);
            }, false);
            form.elements.namedItem("save_button").addEventListener("click", function()
            {
                GM_setValue("killQuotes", this.form.elements.kill_quotes.checked);
                GM_setValue("notification", this.form.elements.notify.checked);
                GM_setValue("killTopics", this.form.elements.kill_topics.checked);
                unsafeWindow.top.document.body.removeChild(prefs);
                unsafeWindow.top.document.body.removeChild(blocker);
            }, false);
            form.elements.namedItem("ignore_user_button").addEventListener("click", addGloballyIgnoredUser, false);
            form.elements.namedItem("topic_ignore_user_button").addEventListener("click", addPerTopicIgnoredUser, false);
        }
    }, false);

    document.body.appendChild(prefs);

    prefs.id = "uil_preferences";
    prefs.name = "uil_preferences";
    prefs.style.position = "fixed";
    prefs.style.top = "1em";
    prefs.style.left = "0px";
    prefs.style.right = "0px";
    prefs.style.border = "none";
    prefs.style.height = "100%";
    prefs.src = PREFS_HTML;
});

// Import Ignored User List menu command
if (window.location.href.endsWith("/index.php?act=UserCP&CODE=ignore"))
{
    GM_registerMenuCommand("Import Ignored User List", function()
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

        UIL.Config.setGloballyIgnoredUsers(newList);
    });
}