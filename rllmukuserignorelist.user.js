// ==UserScript==
// @name        Rllmuk User Ignore List
// @namespace   http://insin.woaf.net/scripts/
// @description Implements a user ignore list which removes all traces of the users on the list, apart from quotes in other users' posts. Lists can be imported from your Manage Ignored Users page.
// @include     http://www.rllmukforum.com/*
// ==/UserScript==

/* Changelog
 * ---------
 * 2005-05-26 Functionally complete version finished, tidied up and commented.
 * -------------------------------------------------------------------------- */

(
function()
{
    // Check for required Greasemonkey functions
    if (!GM_getValue || !GM_registerMenuCommand)
    {
        alert("'Remove Posts' requires Greasemonkey 0.3 or higher - please " +
              "upgrade\n\nhttp://greasemonkey.mozdev.org");
        return;
    }

    /* Utility Methods
     ------------------------------------------------------------------------ */

    /**
     * Given a search term and an array, determines if the search term is in the
     * array.
     * @param searchTerm The term to search for.
     * @param array The array to search in.
     * @return true if the search term is in the array, false otherwise.
     */
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
    }

    /**
     * Determines if a String ends with a given String value.
     * @param s The String value to test with.
     * @return true if this String ends with the given String value, false
     *         otherwise.
     */
    String.prototype.endsWith = function(s)
    {
        lastIndex = this.lastIndexOf(s);
        return (lastIndex != -1 && lastIndex == (this.length - s.length));
    };

    /* Configuration & Initialisation
     ------------------------------------------------------------------------ */

    // Get notification status
    var UIL_notification;
    var n = GM_getValue("notification");
    if (n == undefined) // Deal with first time run
    {
        GM_setValue("notification", true);
        UIL_notification = true;
    }
    else
    {
        UIL_notification = n;
    }

    // Get ignored user list
    var UIL_ignoredUsers = GM_getValue("ignoredUsers");

    // Initialise posts removed counter
    var UIL_postsRemoved = 0;

    /* Post Removal & Notification Display
     ------------------------------------------------------------------------ */

    // Remove posts from topic pages
    if ((window.location.href.indexOf("showtopic=") != -1
        || window.location.href.indexOf("act=ST") != -1)
        && UIL_ignoredUsers != undefined)
    {
        // Create an array of usernames to ignore
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
                // Remove the post
                node.parentNode.parentNode.parentNode.parentNode.style.display
                    = "none";
                // Increment counter
                UIL_postsRemoved++;
            }
        }
    }

    // Remove posts from post/edit/preview topic summary
    if ((window.location.href.indexOf("act=Post") != -1
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
    }

    // Display information about number of posts removed
    if (UIL_notification && UIL_postsRemoved > 0)
    {
        // Create an element to contain the information
        var s = document.createElement("DIV");
        s.id = "UIL-status";
        s.style.position = "fixed";
        s.style.top = "0px";
        s.style.right = "0px";
        s.style.MozBorderRadiusBottomleft = "1em";
        s.style.backgroundColor = "red";
        s.style.color = "white";
        s.style.padding = "3px 6px 5px 8px";
        s.style.fontWeight = "bold";
        // Build the information
        var r = UIL_postsRemoved + " post";
        if (UIL_postsRemoved > 1) r += "s";
        r += " removed";
        // Show the information
        s.innerHTML = r;
        document.body.appendChild(s);

        // Set up a function to remove the information
        window.removeUILStatus = function()
        {
            var st = document.getElementById("UIL-status");
            /* TODO Find out why changing style rules doesn't affect rendering
            var op = st.style.opacity;
            if (op >= 0.1)
            {
                st.style.opacity = (op - 0.1);
                setTimeout("removeUILStatus()", 100);
            }
            else
            {
                st.parentNode.removeChild(st);
            }
            */
            st.parentNode.removeChild(st);
        }
        // Set a timeout to call the above function
        window.setTimeout("removeUILStatus()", 2500);
    }

    /* Menu Commands
     ------------------------------------------------------------------------ */

    // Edit Ignored User List menu command
    function UIL_editIgnoredUsers()
    {
        // Get the current username list
        var ignoredUsers = GM_getValue("ignoredUsers");
        var oldList;
        if (ignoredUsers != undefined)
        {
            oldList = ignoredUsers;
        }
        else
        {
            oldList = "";
        }

        // Pop up a prompt containing the current username list
        var newList =
            prompt("Edit ignored usernames, separating usernames with ';'",
                   oldList);

        // If the edit was ok'ed, store the username list
        if (newList != undefined)
        {
            GM_setValue("ignoredUsers", newList);
        }
    }
    // Register the menu command
    GM_registerMenuCommand("Edit Ignored User List", UIL_editIgnoredUsers);

    // Import Ignored User List menu command
    if (window.location.href.endsWith("/index.php?act=UserCP&CODE=ignore"))
    {
        function UIL_importIgnoredUsers()
        {
            // Get a list of username links
            var nodes =
                document.evaluate(
                "//div[@class='borderwrapm']/table/tbody/tr/td/b/a",
                document,
                null,
                XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                null);

            // Create a semicolon-delimited list of usernames
            var newList = "";
            for (var i = 0; i < nodes.snapshotLength; i++)
            {
                if (i > 0)
                {
                    newList += ";";
                }
                var node = nodes.snapshotItem(i);
                newList += node.innerHTML;
            }

            // Store the username list
            GM_setValue("ignoredUsers", newList);
        }
        // Register the menu command
        GM_registerMenuCommand("Import Ignored User List",
                               UIL_importIgnoredUsers);
    }

    // User Ignore Notification toggling menu command
    function UIL_toggleNotification()
    {
        GM_setValue("notification", !UIL_notification);
        window.location.reload();
    }
    // Register the menu command with an appropriate label
    if (UIL_notification)
    {
        GM_registerMenuCommand("Turn User Ignore Notification Off",
                               UIL_toggleNotification);
    }
    else
    {
        GM_registerMenuCommand("Turn User Ignore Notification On",
                               UIL_toggleNotification);
    }
}
)();