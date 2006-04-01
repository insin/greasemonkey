// ==UserScript==
// @name        Rllmuk User Ignore List
// @namespace   http://insin.woaf.net/scripts/
// @description Implements a user ignore list which removes all traces of the users on the list. The ignore list can be synchronised with your Manage Ignored Users settings when viewing that page.
// @include     http://www.rllmukforum.com/*
// ==/UserScript==

/* Changelog
 * ---------
 * 2006-03-10 Updated to work with latest version of Greasemonkey and to remove
 *            posts containing quotes from ignored users.
 * 2005-05-26 Functionally complete version finished, tidied up and commented.
 * -------------------------------------------------------------------------- */

(
function()
{
    /* Utility Methods
    ------------------------------------------------------------------------- */
    function isInArray(searchTerm, array)
    {
        if (array.length == 1)
        {
            return (array[0] == searchTerm);
        }

        for(var i = 0; i < array.length; i++)
        {
            if (array[i] == searchTerm)
            {
                return true;
            }
        }
        return false;
    };

    String.prototype.endsWith = function(s)
    {
        lastIndex = this.lastIndexOf(s);
        return (lastIndex != -1 && lastIndex == (this.length - s.length));
    };

    /* Configuration & Initialisation
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
    var UIL_ignoredUsers = GM_getValue("ignoredUsers");
    var UIL_postsRemoved = 0;

    /* Post Removal And Notification
    ------------------------------------------------------------------------- */
    // Remove posts from topic pages
    if ((window.location.href.indexOf("showtopic=") != -1
        || window.location.href.indexOf("act=ST") != -1)
        && UIL_ignoredUsers != undefined)
    {
        // Create an array of usernames to be ignored
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
            if (isInArray(node.innerHTML, users))
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
                        node.parentNode.parentNode.parentNode.parentNode.style.display = "none";
                        UIL_postsRemoved++;
                        break;
                    }
                }
            }
        }
    }

    // Remove posts from post/edit/preview topic summary
    if ((window.location.href.indexOf("act=post") != -1
        || window.location.href.endsWith("/index.php?"))
        && UIL_ignoredUsers != undefined)
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
            if (isInArray(node.innerHTML, users))
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
    // Edit Ignored User List menu command
    GM_registerMenuCommand("Edit Ignored User List", function()
    {
        var ignoredUsers = GM_getValue("ignoredUsers") || "";
        var newList =
            prompt("Edit ignored usernames, separating usernames with ';'",
                   ignoredUsers);

        // If the edit was ok'ed, store the username list
        if (newList != undefined)
        {
            GM_setValue("ignoredUsers", newList);
        }
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

    // User Ignore Notification toggle menu command
    var toggleTo = UIL_notification ? "Off" : "On";
    GM_registerMenuCommand("Turn User Ignore Notification " + toggleTo, function()
    {
        GM_setValue("notification", !UIL_notification);
        window.location.reload();
    });

    // Quote Killing toggle menu command
    var toggleTo = UIL_killQuotes ? "Off" : "On";
    GM_registerMenuCommand("Turn Ignored User Quote Killing " + toggleTo, function()
    {
        GM_setValue("killQuotes", !UIL_killQuotes);
        window.location.reload();
    });
}
)();