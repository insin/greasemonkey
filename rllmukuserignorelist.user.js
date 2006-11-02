// ==UserScript==
// @name        Rllmuk User Ignore List
// @namespace   http://www.jonathanbuchanan.plus.com/repos/greasemonkey/
// @description Implements a user ignore list which removes all traces of the users on the list. The ignore list can be synchronised with your Manage Ignored Users settings when viewing that page.
// @include     http://www.rllmukforum.com/*
// ==/UserScript==

/* Changelog
 * ---------
 * 2006-11-02 Added GUI for configuration instead of using clunky menu items.
 *            Added removal of topics created by ignored users.
 * 2006-09-09 Fixed bug where the number of posts reported as being removed was
 *            incorrect when an ignored user was quoted repeatedly.
 *            Replaced use of isInArray function with use of JS 1.6's new
 *            indexOf Array instance method.
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
var UIL_ignoredUsers = GM_getValue("ignoredUsers");
var UIL_postsRemoved = 0;

/* Post Removal And Notification
------------------------------------------------------------------------- */
// Remove posts from topic pages
if (UIL_ignoredUsers != undefined &&
    (window.location.href.toLowerCase().indexOf("showtopic=") != -1 ||
     window.location.href.indexOf("act=ST") != -1))
{
    var users = UIL_ignoredUsers.split(";");

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
        if (users.indexOf(node.innerHTML) != -1)
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
            for (var j = 0; j < users.length; j++)
            {
                if (node.innerHTML.indexOf("QUOTE(" + users[j]) === 0)
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
if (UIL_ignoredUsers != undefined &&
    (window.location.href.toLowerCase().indexOf("act=post") != -1 ||
     window.location.href.endsWith("/index.php?")))
{
    // Create an array of usernames to ignore
    var users = UIL_ignoredUsers.split(";");

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
        if (users.indexOf(node.innerHTML) != -1)
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
            for (var j = 0; j < users.length; j++)
            {
                if (node.innerHTML.indexOf("QUOTE(" + users[j]) === 0)
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
if (UIL_ignoredUsers != undefined && UIL_killTopics &&
    (window.location.href.indexOf("showforum=") != -1 ||
     window.location.href.indexOf("act=SF") != -1 ||
     window.location.href.indexOf("searchid=") != -1))
{
    var users = UIL_ignoredUsers.split(";");

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
        if (users.indexOf(topicStarterLinkNode.innerHTML) != -1)
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
var PREFS_HTML = "data:text/html;charset=utf-8;base64,PCFET0NUWVBFIGh0bWwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDQuMDEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvVFIvaHRtbDQvc3RyaWN0LmR0ZCI%2BDQo8aHRtbCBsYW5nPSJlbiI%2BDQo8aGVhZD4NCiAgPHRpdGxlPlVzZXJzY3JpcHQgUHJlZmVyZW5jZXM8L3RpdGxlPg0KICA8bWV0YSBodHRwLWVxdWl2PSJDb250ZW50LVR5cGUiIGNvbnRlbnQ9InRleHQvaHRtbDsgY2hhcnNldD1VVEYtOCI%2BDQogIDxtZXRhIG5hbWU9IkF1dGhvciIgY29udGVudD0iSm9uYXRoYW4gQnVjaGFuYW4iPg0KICA8bWV0YSBuYW1lPSJDb3B5cmlnaHQiIGNvbnRlbnQ9IiZjb3B5OyAyMDA2LCBKb25hdGhhbiBCdWNoYW5hbiI%2BDQogIDxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI%2BDQogIC5tb2R1bGUgeyBib3JkZXI6IDFweCBzb2xpZCAjY2NjOyBtYXJnaW4tYm90dG9tOiA1cHg7IGJhY2tncm91bmQtY29sb3I6ICNmZmY7IH0NCiAgLm1vZHVsZSBoMiwgLm1vZHVsZSBjYXB0aW9uIHsgbWFyZ2luOiAwOyBwYWRkaW5nOiAycHggNXB4IDNweCA1cHg7IGZvbnQtc2l6ZTogMTFweDsgdGV4dC1hbGlnbjogbGVmdDsgZm9udC13ZWlnaHQ6IGJvbGQ7IGJhY2tncm91bmQ6ICM3Q0EwQzcgdXJsKCJkYXRhOmltYWdlL2dpZjtiYXNlNjQsUjBsR09EbGhFUUFmQU9ZQUFMelM2YkRKNDQlMkJ3MFlHbHlydlI2TFRNNVlpcXpuNml5SU9ueTRDa3lhRyUyQjI0MnUwS0slMkIyN2pQNTN1Z3hvaXF6WWFvekp5NjJKcTQxM3VneDRxc3o1JTJCODJhVEEzSzdING9Tbnk1JTJCODJyYk41cm5RNktUQTNhZkMzckxMNUpTMDFLbkUzN2JPNW4lMkJreVp5NTJIeWh5SzdJNGJMSzVMalA1cm5RNTVXMDFLbkQzNWUyMVg2anlLN0g0Wkt5MDZ2RzRYeWl5SXl0MEpTejFMSEo0NHVzenBlMTFueWh4N3JRNTVlMjFwR3gwNmZCM29xc3puMml4NUt4MHBlMTFhUyUyRjNJS2x5cXpHNEtiQzNwcTMxcnZSNmF6RjRMWE01WXl1MEt2RjRiUEs0NW00MXFmQzNidlM2SDJoeDZ6RzRZS215clBLNUt6RjRaV3oxSXl1ejVxNDFvYXB6WUNqeVpLeTBxckUzN2ZONXFyRDRKJTJCNzJwQ3cwWkd5MG9HbXlvJTJCdjBiVE41YlhONVptNDE1MjYySnk2MllXb3pJV3B6S3JEMzRhb3piclI2SSUyQnYwcmpPNXJqTzU2ZkIzYW5FNElTbXk3UEw1TGZPNXAlMkI3MmJiTjVZYXB6SHVoeHJmUDVueWd4N2ZQNTZLOTI0JTJCdzBySEo0cVhBM1l1cnozNmp5WXVzenlINUJBQUFBQUFBTEFBQUFBQVJBQjhBQUFmJTJGZ0FDQ2c0U0ZnZ1FFVEVSTWlJaEVCR21QakFRYkd6YzNLQ2lXbVpZM2xSc29hdzJqZGljbkRhZW9xSGhzRFJvaHI3QWhXVmx4Y3hxNEliQmdSZ1clMkJZYjFoQlVaZ3ZzWW1IbEFlU2NqSUhzOG1KbkJRY0FFQk05YlkxbnZXMmRnWExTMGxMUmNsNWVQbTRCY1hSVUV2VGtoUjdlOHZRVkZJTDBWSUttNVlJQ0FxQUFyVWdpV2dsak5DZEN6cDBLWkRoNFU2T3VnUUlrVGlFZzRjZm5Dd1lDR2pCVDRjTlhMa29JQUJnNUlvVFNwWWVUSVBnd29aTW15cEFGTm1CcG9WNU1Tc01HYkVpQWdSZmdJZFE4WW5HYUFSSkNoVk1vUUtGYVpLeFlpUm9FVENrQm9yVnRUd3NRSUhEaDglMkJjR0Q5cWpYRkJ4a3lVcGlWY3ZiRDJoUXlxVDY0NkpFang1VWVjN3U0c0pzanJ3c0JBcmdBRHZ4RlFHRTFBdlFNamhGamdXUEhNWTRjZWR4NHloRUttR25RMkVGQk00VWRmU2o4JTJCYnpqZ1FIVEJsSSUyRldLMmF0WUV5YUNDWWdVRGJEQjBJVmN4VUtVTWJBZ0lNQ0lMJTJGZmhNY09JYmp2NThBR2VCbE9mTW5BNkk3ajU1QWhJanExYTliU1pCZ08zWWVMRmdjR0g5QVBQbnk0ZjNBc01HZVJCTVNKSGpBYUdKRGZoTWVKTzQ0bUxEZlFSMyUyQkV3VFlud01PQkFJQU93JTNEJTNEIikgdG9wIGxlZnQgcmVwZWF0LXg7IGNvbG9yOiAjZmZmOyBib3JkZXItYm90dG9tOiAwOyB9DQoNCiAgLmZvcm0tcm93IHsgb3ZlcmZsb3c6IGhpZGRlbjsgcGFkZGluZzogOHB4IDEycHg7IGZvbnQtc2l6ZTogMTFweDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNlZWU7IGJvcmRlci1yaWdodDogMXB4IHNvbGlkICNlZWU7IH0NCiAgLmZvcm0tcm93IGltZywgLmZvcm0tcm93IGlucHV0IHsgdmVydGljYWwtYWxpZ246IG1pZGRsZTsgfQ0KICAuZm9ybS1maWVsZCB7IGZsb2F0OiBsZWZ0OyB9DQogIC5hbGlnbmVkIGxhYmVsIHsgcGFkZGluZzogMCAxZW0gM3B4IDA7IGZsb2F0OiBsZWZ0OyB3aWR0aDogOGVtOyB9DQogIC5jaGVja2JveC1yb3cgbGFiZWwgeyBwYWRkaW5nOiAwOyBmbG9hdDogbm9uZTsgd2lkdGg6IGF1dG87IH0NCiAgLnN1Ym1pdC1yb3cgeyBwYWRkaW5nOiA4cHggMTJweDsgdGV4dC1hbGlnbjogcmlnaHQ7IGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZWVlOyBib3JkZXItcmlnaHQ6IDFweCBzb2xpZCAjZWVlOyB9DQoNCiAgdWwgeyBtYXJnaW46IDA7IHBhZGRpbmc6IDAgMCAwIDEuNWVtOyBsaW5lLWhlaWdodDogMS41ZW07IH0NCiAgbGkgeyBtYXJnaW46IDA7IHBhZGRpbmc6IDA7IH0NCg0KICBzcGFuLmNvbnRyb2wgeyB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTsgY3Vyc29yOiBwb2ludGVyOyBjb2xvcjogIzAwZjsgfQ0KICA8L3N0eWxlPg0KPC9oZWFkPg0KPGJvZHk%2BDQoNCjxmb3JtIG5hbWU9InByZWZlcmVuY2VzIiBpZD0icHJlZmVyZW5jZXMiIGNsYXNzPSJhbGlnbmVkIj4NCiAgPGRpdiBjbGFzcz0ibW9kdWxlIj4NCiAgICA8aDI%2BSWdub3JlZCBVc2VyczwvaDI%2BDQogICAgPGRpdiBjbGFzcz0iZm9ybS1yb3ciPg0KICAgICAgPGxhYmVsIGZvcj0iaWdub3JlX3VzZXIiPklnbm9yZSBVc2VyOjwvbGFiZWw%2BDQogICAgICA8aW5wdXQgdHlwZT0idGV4dCIgbmFtZT0iaWdub3JlX3VzZXIiPiA8aW5wdXQgdHlwZT0iYnV0dG9uIiB2YWx1ZT0iQWRkIiBpZD0iaWdub3JlX3VzZXJfYnV0dG9uIiBuYW1lPSJpZ25vcmVfdXNlcl9idXR0b24iPg0KICAgIDwvZGl2Pg0KICAgIDxkaXYgY2xhc3M9ImZvcm0tcm93Ij4NCiAgICAgIDxsYWJlbD5JZ25vcmVkIFVzZXJzOjwvbGFiZWw%2BDQogICAgICA8ZGl2IGNsYXNzPSJmb3JtLWZpZWxkIj4NCiAgICAgICAgPHVsIGlkPSJpZ25vcmVkX3VzZXJzIj4NCiAgICAgICAgPC91bD4NCiAgICAgIDwvZGl2Pg0KICAgIDwvZGl2Pg0KICA8L2Rpdj4NCg0KICA8ZGl2IGNsYXNzPSJtb2R1bGUiPg0KICAgIDxoMj5QcmVmZXJlbmNlczwvaDI%2BDQogICAgPGRpdiBjbGFzcz0iZm9ybS1yb3cgY2hlY2tib3gtcm93Ij4NCiAgICAgIDxsYWJlbCBmb3I9ImtpbGxfcXVvdGVzIj48aW5wdXQgdHlwZT0iY2hlY2tib3giIG5hbWU9ImtpbGxfcXVvdGVzIiBpZD0ia2lsbF9xdW90ZXMiPiBSZW1vdmUgcG9zdHMgd2hpY2ggcXVvdGUgaWdub3JlZCB1c2VyczwvbGFiZWw%2BDQogICAgPC9kaXY%2BDQogICAgPGRpdiBjbGFzcz0iZm9ybS1yb3cgY2hlY2tib3gtcm93Ij4NCiAgICAgIDxsYWJlbCBmb3I9Im5vdGlmeSI%2BPGlucHV0IHR5cGU9ImNoZWNrYm94IiBuYW1lPSJub3RpZnkiIGlkPSJub3RpZnkiPiBEaXNwbGF5IG5vdGlmaWNhdGlvbiB3aGVuIHBvc3RzIGFyZSByZW1vdmVkPC9sYWJlbD4NCiAgICA8L2Rpdj4NCiAgICA8ZGl2IGNsYXNzPSJmb3JtLXJvdyBjaGVja2JveC1yb3ciPg0KICAgICAgPGxhYmVsIGZvcj0ia2lsbF90b3BpY3MiPjxpbnB1dCB0eXBlPSJjaGVja2JveCIgbmFtZT0ia2lsbF90b3BpY3MiIGlkPSJraWxsX3RvcGljcyI%2BIFJlbW92ZSB0b3BpY3MgY3JlYXRlZCBieSBpZ25vcmVkIHVzZXJzPC9sYWJlbD4NCiAgICA8L2Rpdj4NCiAgPC9kaXY%2BDQoNCiAgPGRpdiBjbGFzcz0ibW9kdWxlIj4NCiAgICA8ZGl2IGNsYXNzPSJzdWJtaXQtcm93Ij4NCiAgICAgIDxpbnB1dCB0eXBlPSJidXR0b24iIHZhbHVlPSJDbG9zZSIgbmFtZT0iY2xvc2VfYnV0dG9uIiBpZD0iY2xvc2VfYnV0dG9uIj4NCiAgICAgIDxpbnB1dCB0eXBlPSJidXR0b24iIHZhbHVlPSJTYXZlIFByZWZlcmVuY2VzIiBuYW1lPSJzYXZlX2J1dHRvbiIgaWQ9InNhdmVfYnV0dG9uIj4NCiAgICA8L2Rpdj4NCiAgPC9kaXY%2BDQo8L2Zvcm0%2BDQoNCjwvYm9keT4NCjwvaHRtbD4%3D";

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

    var ignoredUsers = GM_getValue("ignoredUsers");
    if (ignoredUsers !== undefined && ignoredUsers.length > 0)
    {
        ignoredUsers = ignoredUsers.split(";");
    }
    else
    {
        ignoredUsers = [];
    }

    function ignoreUser()
    {
        var form = prefs.contentDocument.forms.namedItem("preferences");
        var ignoredUser = form.elements.namedItem("ignore_user");
        var userName = ignoredUser.value;
        if (userName.length > 0)
        {
            if (ignoredUsers.indexOf(userName) != -1)
            {
                alert("You're already ignoring " + userName);
            }
            else
            {
                ignoredUsers.push(userName);
                ignoredUsers.sort();
                GM_setValue("ignoredUsers", ignoredUsers.join(";"));
                createIgnoredUserList();
            }
            ignoredUser.value = "";
        }
    }

    function unignoreUser(userName)
    {
        return function()
        {
            if (confirm("Are you sure you want to unignore " + userName + "?"))
            {
                ignoredUsers.splice(ignoredUsers.indexOf(userName), 1);
                GM_setValue("ignoredUsers", ignoredUsers.join(";"));
                createIgnoredUserList();
            }
        }
    }

    function createIgnoredUserList()
    {
        var document = prefs.contentDocument;
        var list = document.getElementById("ignored_users");
        while (list.firstChild)
        {
            list.removeChild(list.firstChild);
        }
        ignoredUsers.forEach(function(userName)
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

    var prefs = document.createElement("iframe");

    prefs.addEventListener("load", function()
    {
        var form = prefs.contentDocument.forms.namedItem("preferences");
        if (form)
        {
            createIgnoredUserList();

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
            form.elements.namedItem("ignore_user_button").addEventListener("click", ignoreUser, false);
        }
    }, false);

    document.body.appendChild(prefs);

    prefs.id = "uil_preferences";
    prefs.name = "uil_preferences";
    prefs.style.position = "fixed";
    prefs.style.top = "1em";
    prefs.style.left = "30%";
    prefs.style.right = "30%";
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

        var newList = "";
        for (var i = 0; i < nodes.snapshotLength; i++)
        {
            if (i > 0)
            {
                newList += ";";
            }
            newList += nodes.snapshotItem(i).innerHTML;
        }
        GM_setValue("ignoredUsers", newList);
    });
}
