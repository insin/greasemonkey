// ==UserScript==
// @name        Rllmuk Uber Script
// @namespace   http://www.jonathanbuchanan.plus.com/repos/greasemonkey/
// @description Integrates small forum tweaking scripts into one uber-script.
// @include     http://www.rllmukforum.com/*
// @include     http://rllmukforum.com/*
// ==/UserScript==

/* Changelog
 * ---------
 * 2007-03-10 Created script skellington, with a few script functions
 *            implemented as examples.
 * -------------------------------------------------------------------------- */

String.prototype.endsWith = function(s)
{
    lastIndex = this.lastIndexOf(s);
    return (lastIndex != -1 && lastIndex == (this.length - s.length));
};

String.prototype.capFirst = function()
{
    return this.substr(0, 1).toUpperCase() + this.substr(1);
};

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
var Uber =
{
    init: function()
    {
        Uber.Config.init();
        var pageType = this.determineCurrentPageType();
        this.processPage(pageType);
        this.registerControls(pageType);
    },

    /**
     * Determines which kind of forum page we're on.
     */
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
        return pageType;
    },

    /**
     * Calls the appropriate page processing functions based on the current
     * page type.
     */
    processPage: function(pageType)
    {
        this.everyPageProcessor();
        if (pageType !== null)
        {
            var pageProcessor = pageType + "PageProcessor";
            if (typeof(this[pageProcessor]) == "function")
            {
                this[pageProcessor]();
            }
        }
    },

    /**
     * Executed on every forum page.
     */
    everyPageProcessor: function()
    {
        if (Uber.Config.getRestoreSearchLink())
        {
            Uber.Scripts.restoreSearchLink();
        }
    },

    /**
     * Executed on topic display pages.
     */
    topicPageProcessor: function()
    {
        if (Uber.Config.getUndoImageResizing())
        {
            Uber.Scripts.undoImageResizing();
        }
    },

    /**
     * Executed on post add/edit/preview pages.
     */
    postEditPreviewPageProcessor: function()
    {
    },

    /**
     * Executed on topic listing pages.
     */
    topicListingPageProcessor: function()
    {
    },

    /**
     * Adds any required script controls to the page.
     */
    registerControls: function(pageType)
    {
        var controls =
            document.getElementById("userlinks");
        if (controls)
        {
            controls = controls.getElementsByTagName("p")[1];
            controls.insertBefore(document.createTextNode(" . "), controls.firstChild);
            controls.insertBefore(this.createLinkControl("Uber Script",
                                                         Uber.UI.show.bind(Uber.UI)),
                                  controls.firstChild);
        }
    },

    /**
     * Creates a dummy link which executes the given function when clicked.
     */
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
 * Functions which perform the work of one of the scripts being integrated.
 */
Uber.Scripts =
{
    /**
     * Restores the "Search" link in the user toolbar.
     */
    restoreSearchLink: function()
    {
        var userlinks = document.getElementById("userlinks");
        if (userlinks)
        {
            userlinks = userlinks.getElementsByTagName("p")[1];
            userlinks.insertBefore(document.createTextNode(" . "), userlinks.firstChild);
            var searchLink = document.createElement("a");
            searchLink.href = "http://www.rllmukforum.com/index.php?act=Search";
            searchLink.appendChild(document.createTextNode("Search"));
            userlinks.insertBefore(searchLink, userlinks.firstChild);
        }
    },

    /**
     * Undoes the forum's new image resizing functionality.
     */
    undoImageResizing: function()
    {
        // Remove linked-image class from user posted images - this should
        // prevent images which take some time to load from being detected
        // and resized.
        var images = document.evaluate("//img[@class='linked-image']",
                                       document,
                                       null,
                                       XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                                       null);

        for (var i = 0; i < images.snapshotLength; i++)
        {
            var image = images.snapshotItem(i);
            if (image.alt != "Attached image") // Leave attached images alone
            {
                image.className = "";
            }
        }

        // Images may have been cached or were otherwise quick to load, so
        // look for image toolbars, hiding them and restoring their associated
        // image to its normal size.
        var toolbars = document.evaluate("//div[@class='resized-linked-image']",
                                         document,
                                         null,
                                         XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                                         null);

        for (var i = 0; i < toolbars.snapshotLength; i++)
        {
            var toolbar = toolbars.snapshotItem(i);
            if (toolbar.id == null || toolbar.id == "") // Leave attached images alone
            {
                toolbar.style.display = "none";
                var image = toolbar.nextSibling;
                while (image.nodeType != 2) // Skip over any text nodes
                {
                    image = image.nextSibling;
                }
                image.style.width = "auto";
            }
        }
    }
}

/**
 * User Interface.
 */
Uber.UI =
{
    /**
     * A data: URI containing a complete HTML document for the preferences UI,
     * generated using http://software.hixie.ch/utilities/cgi/data/data.
     */
    PREFS_HTML: "data:text/html;charset=utf-8;base64,PCFET0NUWVBFIGh0bWwgUFVCTElDICItLy9XM0MvL0RURCBIVE1MIDQuMDEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvVFIvaHRtbDQvc3RyaWN0LmR0ZCI%2BDQo8aHRtbCBsYW5nPSJlbiI%2BDQo8aGVhZD4NCiAgPHRpdGxlPlVzZXJzY3JpcHQgUHJlZmVyZW5jZXM8L3RpdGxlPg0KICA8bWV0YSBodHRwLWVxdWl2PSJDb250ZW50LVR5cGUiIGNvbnRlbnQ9InRleHQvaHRtbDsgY2hhcnNldD1VVEYtOCI%2BDQogIDxtZXRhIG5hbWU9IkF1dGhvciIgY29udGVudD0iSm9uYXRoYW4gQnVjaGFuYW4iPg0KICA8bWV0YSBuYW1lPSJDb3B5cmlnaHQiIGNvbnRlbnQ9IiZjb3B5OyAyMDA3LCBKb25hdGhhbiBCdWNoYW5hbiI%2BDQogIDxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI%2BDQogIGJvZHkgeyBtYXJnaW46MDsgcGFkZGluZzowOyBmb250LXNpemU6MTJweDsgZm9udC1mYW1pbHk6Ikx1Y2lkYSBHcmFuZGUiLCJCaXRzdHJlYW0gVmVyYSBTYW5zIixWZXJkYW5hLEFyaWFsLHNhbnMtc2VyaWY7IGNvbG9yOiMzMzM7IHdpZHRoOiA1NTBweDsgbWFyZ2luOiAwIGF1dG87IH0NCiAgLm1vZHVsZSB7IGJvcmRlcjogMXB4IHNvbGlkICNjY2M7IG1hcmdpbi1ib3R0b206IDVweDsgYmFja2dyb3VuZC1jb2xvcjogI2ZmZjsgfQ0KICAubW9kdWxlIGgyLCAubW9kdWxlIGNhcHRpb24geyBtYXJnaW46IDA7IHBhZGRpbmc6IDJweCA1cHggM3B4IDVweDsgZm9udC1zaXplOiAxMXB4OyB0ZXh0LWFsaWduOiBsZWZ0OyBmb250LXdlaWdodDogYm9sZDsgYmFja2dyb3VuZDogIzdDQTBDNyB1cmwoImRhdGE6aW1hZ2UvZ2lmO2Jhc2U2NCxSMGxHT0RsaEVRQWZBT1lBQUx6UzZiREo0NCUyQncwWUdseXJ2UjZMVE01WWlxem42aXlJT255NENreWFHJTJCMjQydTBLSyUyQjI3alA1M3VneG9pcXpZYW96Snk2MkpxNDEzdWd4NHFzejUlMkI4MmFUQTNLN0g0b1NueTUlMkI4MnJiTjVyblE2S1RBM2FmQzNyTEw1SlMwMUtuRTM3Yk81biUyQmt5Wnk1Mkh5aHlLN0k0YkxLNUxqUDVyblE1NVcwMUtuRDM1ZTIxWDZqeUs3SDRaS3kwNnZHNFh5aXlJeXQwSlN6MUxISjQ0dXN6cGUxMW55aHg3clE1NWUyMXBHeDA2ZkIzb3Fzem4yaXg1S3gwcGUxMWFTJTJGM0lLbHlxekc0S2JDM3BxMzFydlI2YXpGNExYTTVZeXUwS3ZGNGJQSzQ1bTQxcWZDM2J2UzZIMmh4NnpHNFlLbXlyUEs1S3pGNFpXejFJeXV6NXE0MW9hcHpZQ2p5Wkt5MHFyRTM3Zk41cXJENEolMkI3MnBDdzBaR3kwb0dteW8lMkJ2MGJUTjViWE41Wm00MTUyNjJKeTYyWVdveklXcHpLckQzNGFvemJyUjZJJTJCdjByak81cmpPNTZmQjNhbkU0SVNteTdQTDVMZk81cCUyQjcyYmJONVlhcHpIdWh4cmZQNW55Z3g3ZlA1Nks5MjQlMkJ3MHJISjRxWEEzWXVyejM2anlZdXN6eUg1QkFBQUFBQUFMQUFBQUFBUkFCOEFBQWYlMkZnQUNDZzRTRmdnUUVURVJNaUloRUJHbVBqQVFiR3pjM0tDaVdtWlkzbFJzb2F3MmpkaWNuRGFlb3FIaHNEUm9ocjdBaFdWbHhjeHE0SWJCZ1JnVyUyQlliMWhCVVpndnNZbUhsQWVTY2pJSHM4bUpuQlFjQUVCTTliWTFudlcyZGdYTFMwbExSY2w1ZVBtNEJjWFJVRXZUa2hSN2U4dlFWRklMMFZJS201WUlDQXFBQXJVZ2lXZ2xqTkNkQ3pwMEtaRGg0VTZPdWdRSWtUaUVnNGNmbkN3WUNHakJUNGNOWExrb0lBQmc1SW9UU3BZZVRJUGd3b1pNbXlwQUZObUJwb1Y1TVNzTUdiRWlBZ1JmZ0lkUThZbkdhQVJKQ2hWTW9RS0ZhWkt4WWlSb0VUQ2tCb3JWdFR3c1FJSERoOCUyQmNHRDlxalhGQnhreVVwaVZjdmJEMmhReXFUNjQ2SkVqeDVVZWM3dTRzSnNqcndzQkFyZ0FEdnhGUUdFMUF2UU1qaEZqZ1dQSE1ZNGNlZHg0eWhFS21HblEyRUZCTTRVZGZTajglMkJiempnUUhUQmxJJTJGV0syYXRZRXlhQ0NZZ1VEYkRCMElWY3hVS1VNYkFnSU1DSUwlMkZmaE1jT0lianY1OEFHZUJsT2ZNbkE2STdqNTVBaElqcTFhOWJTWkJnTzNZZUxGZ2NHSDlBUFBueTRmM0FzTUdlUkJNU0pIakFhR0pEZmhNZUpPNDRtTERmUVIzJTJCRXdUWW53TU9CQUlBT3clM0QlM0QiKSB0b3AgbGVmdCByZXBlYXQteDsgY29sb3I6ICNmZmY7IGJvcmRlci1ib3R0b206IDA7IH0NCg0KICAuZm9ybS1yb3cgeyBvdmVyZmxvdzogaGlkZGVuOyBwYWRkaW5nOiA4cHggMTJweDsgZm9udC1zaXplOiAxMXB4OyBib3JkZXItYm90dG9tOiAxcHggc29saWQgI2VlZTsgYm9yZGVyLXJpZ2h0OiAxcHggc29saWQgI2VlZTsgfQ0KICAuZm9ybS1yb3cgaW1nLCAuZm9ybS1yb3cgaW5wdXQgeyB2ZXJ0aWNhbC1hbGlnbjogbWlkZGxlOyB9DQogIC5mb3JtLWZpZWxkIHsgZmxvYXQ6IGxlZnQ7IH0NCiAgLmFsaWduZWQgbGFiZWwgeyBwYWRkaW5nOiAwIDFlbSAzcHggMDsgZmxvYXQ6IGxlZnQ7IHdpZHRoOiAxMGVtOyB9DQogIC5jaGVja2JveC1yb3cgbGFiZWwgeyBwYWRkaW5nOiAwOyBmbG9hdDogbm9uZTsgd2lkdGg6IGF1dG87IH0NCiAgcC5oZWxwIHsgY29sb3I6ICM5OTk7IGZvbnQtc2l6ZTogMTFweDsgfQ0KICAuc3VibWl0LXJvdyB7IHBhZGRpbmc6IDhweCAxMnB4OyB0ZXh0LWFsaWduOiByaWdodDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNlZWU7IGJvcmRlci1yaWdodDogMXB4IHNvbGlkICNlZWU7IH0NCg0KICB1bCB7IG1hcmdpbjogLjVlbSAwIDAgMDsgcGFkZGluZzogMCAwIDAgMmVtOyBsaW5lLWhlaWdodDogMS41ZW07IH0NCiAgbGkgeyBtYXJnaW46IDA7IHBhZGRpbmc6IDA7IH0NCiAgdWwuY2hlY2tib3hlcyB7IGZsb2F0OiBsZWZ0OyBtYXJnaW4tbGVmdDogMDsgcGFkZGluZy1sZWZ0OiAwOyBsaXN0LXN0eWxlLXR5cGU6IG5vbmU7IH0NCiAgdWwuY2hlY2tib3hlcyBsYWJlbCB7IHBhZGRpbmc6IDA7IGZsb2F0OiBub25lOyB3aWR0aDogYXV0bzsgfQ0KDQogIHNwYW4uY29udHJvbCB7IHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lOyBjdXJzb3I6IHBvaW50ZXI7IGNvbG9yOiAjMDBmOyB9DQogIHNwYW4uZ2ZwIHsgZm9udC13ZWlnaHQ6IGJvbGQ7IGZvbnQtc3R5bGU6IGl0YWxpYzsgY29sb3I6IHRlYWw7IH0NCiAgPC9zdHlsZT4NCjwvaGVhZD4NCjxib2R5Pg0KDQo8Zm9ybSBuYW1lPSJwcmVmZXJlbmNlcyIgaWQ9InByZWZlcmVuY2VzIiBjbGFzcz0iYWxpZ25lZCI%2BDQogIDxkaXYgY2xhc3M9Im1vZHVsZSI%2BDQogICAgPGgyPlJsbG11ayBVYmVyIFNjcmlwdCBQcmVmZXJlbmNlczwvaDI%2BDQogICAgPGRpdiBjbGFzcz0iZm9ybS1yb3ciPg0KICAgICAgPGxhYmVsPlRpZHkgUG9zdHM6PC9sYWJlbD4NCiAgICAgIDx1bCBjbGFzcz0iY2hlY2tib3hlcyI%2BDQogICAgICAgIDxsaT48bGFiZWwgZm9yPSJ0aWR5X2Rlc3BpbiI%2BPGlucHV0IHR5cGU9ImNoZWNrYm94IiBuYW1lPSJ0aWR5X2Rlc3BpbiIgaWQ9InRpZHlfZGVzcGluIj4gVGlkeSBkZXNwaW4ncyBwb3N0czwvbGFiZWw%2BPC9saT4NCiAgICAgICAgPGxpPjxsYWJlbCBmb3I9InRpZHlfY2h5d3VoeCI%2BPGlucHV0IHR5cGU9ImNoZWNrYm94IiBuYW1lPSJ0aWR5X2NoeXd1aHgiIGlkPSJ0aWR5X2NoeXd1aHgiPiBHZXQgcmlkIG9mIC46Ojo8L2xhYmVsPjwvbGk%2BDQogICAgICAgIDxsaT48bGFiZWwgZm9yPSJ0aWR5X2dpYW50X2ZyeWluZ19wYW4iPjxpbnB1dCB0eXBlPSJjaGVja2JveCIgbmFtZT0idGlkeV9naWFudF9mcnlpbmdfcGFuIiBpZD0idGlkeV9naWFudF9mcnlpbmdfcGFuIj4gTm8gPHNwYW4gY2xhc3M9ImdmcCI%2BZ2lhbnRfZnJ5aW5nX3Bhbjwvc3Bhbj48L2xhYmVsPjwvbGk%2BDQogICAgICA8L3VsPg0KICAgIDwvZGl2Pg0KICAgIDxkaXYgY2xhc3M9ImZvcm0tcm93IGNoZWNrYm94LXJvdyI%2BDQogICAgICA8bGFiZWwgZm9yPSJ1bmRvX2ltYWdlX3Jlc2l6aW5nIj48aW5wdXQgdHlwZT0iY2hlY2tib3giIG5hbWU9InVuZG9faW1hZ2VfcmVzaXppbmciIGlkPSJ1bmRvX2ltYWdlX3Jlc2l6aW5nIj4gVW5kbyBhdXRvbWF0aWMgaW1hZ2UgcmVzaXppbmc8L2xhYmVsPg0KICAgIDwvZGl2Pg0KICAgIDxkaXYgY2xhc3M9ImZvcm0tcm93IGNoZWNrYm94LXJvdyI%2BDQogICAgICA8bGFiZWwgZm9yPSJyZXN0b3JlX3NlYXJjaF9saW5rIj48aW5wdXQgdHlwZT0iY2hlY2tib3giIG5hbWU9InJlc3RvcmVfc2VhcmNoX2xpbmsiIGlkPSJyZXN0b3JlX3NlYXJjaF9saW5rIj4gUHV0IHRoZSBTZWFyY2ggbGluayBiYWNrIGF0IHRoZSB0b3Agb2YgdGhlIHBhZ2U8L2xhYmVsPg0KICAgIDwvZGl2Pg0KICAgIDxkaXYgY2xhc3M9ImZvcm0tcm93IGNoZWNrYm94LXJvdyI%2BDQogICAgICA8bGFiZWwgZm9yPSJhdXRvX3F1aWNrX2VkaXQiPjxpbnB1dCB0eXBlPSJjaGVja2JveCIgbmFtZT0iYXV0b19xdWlja19lZGl0IiBpZD0iYXV0b19xdWlja19lZGl0Ij4gQXV0b21hdGljYWxseSB1c2UgUXVpY2sgRWRpdDwvbGFiZWw%2BDQogICAgPC9kaXY%2BDQogICAgPGRpdiBjbGFzcz0iZm9ybS1yb3cgY2hlY2tib3gtcm93Ij4NCiAgICAgIDxsYWJlbCBmb3I9InJlbW92ZV91c2VybmFtZV9tZW51cyI%2BPGlucHV0IHR5cGU9ImNoZWNrYm94IiBuYW1lPSJyZW1vdmVfdXNlcm5hbWVfbWVudXMiIGlkPSJyZW1vdmVfdXNlcm5hbWVfbWVudXMiPiBSZW1vdmUgdXNlcm5hbWUgbWVudXM8L2xhYmVsPg0KICAgIDwvZGl2Pg0KICAgIDxkaXYgY2xhc3M9ImZvcm0tcm93IGNoZWNrYm94LXJvdyI%2BDQogICAgICA8bGFiZWwgZm9yPSJjbGVhbl9wb3N0X2Zvcm0iPjxpbnB1dCB0eXBlPSJjaGVja2JveCIgbmFtZT0iY2xlYW5fcG9zdF9mb3JtIiBpZD0iY2xlYW5fcG9zdF9mb3JtIj4gQ2xlYW4gdXAgdGhlIEFkZC9FZGl0IHBvc3QgZm9ybTwvbGFiZWw%2BDQogICAgPC9kaXY%2BDQogICAgPGRpdiBjbGFzcz0iZm9ybS1yb3cgY2hlY2tib3gtcm93Ij4NCiAgICAgIDxsYWJlbCBmb3I9ImZpeF9zcG9pbGVycyI%2BPGlucHV0IHR5cGU9ImNoZWNrYm94IiBuYW1lPSJmaXhfc3BvaWxlcnMiIGlkPSJmaXhfc3BvaWxlcnMiPiBQdXQgc3BvaWxlcnMgYmFjayB0byB0aGUgd2F5IHRoZXkgdXNlZCB0byBiZTwvbGFiZWw%2BDQogICAgPC9kaXY%2BDQogPC9kaXY%2BDQoNCiAgPGRpdiBjbGFzcz0ibW9kdWxlIj4NCiAgICA8ZGl2IGNsYXNzPSJzdWJtaXQtcm93Ij4NCiAgICAgIDxpbnB1dCB0eXBlPSJidXR0b24iIHZhbHVlPSJDbG9zZSIgbmFtZT0iY2xvc2VfYnV0dG9uIiBpZD0iY2xvc2VfYnV0dG9uIj4NCiAgICAgIDxpbnB1dCB0eXBlPSJidXR0b24iIHZhbHVlPSJTYXZlIFByZWZlcmVuY2VzIiBuYW1lPSJzYXZlX2J1dHRvbiIgaWQ9InNhdmVfYnV0dG9uIj4NCiAgICA8L2Rpdj4NCiAgPC9kaXY%2BDQo8L2Zvcm0%2BDQoNCjwvYm9keT4NCjwvaHRtbD4%3D",

    /**
     * Shows the preferences UI - the UI is shown in an <code>iframe</code>
     * which covers the entire display area.
     */
    show: function(e)
    {
        if (e)
        {
            e.preventDefault();
            e.stopPropagation();
        }

        var blocker = document.createElement("div");
        this.blocker = blocker;
        blocker.id = "uber_blocker";
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

        prefs.id = "uber_preferences";
        prefs.name = "uber_preferences";
        prefs.style.position = "fixed";
        prefs.style.top = "1em";
        prefs.style.left = "0px";
        prefs.style.right = "0px";
        prefs.style.border = "none";
        prefs.style.height = "100%";
        prefs.style.overflow = "hidden";
        prefs.src = this.PREFS_HTML;
    },

    /**
     * Hides the preferences UI.
     */
    hide: function()
    {
        document.body.removeChild(this.prefs);
        document.body.removeChild(this.blocker);
        this.prefs = null;
        this.blocker = null;
    },

    /**
     * Onload event handler for the preferences document - this will be executed
     * when the <code>iframe</code> containing the preferences UI has loaded.
     */
    preferenceDocumentLoadHandler: function()
    {
        var form = this.prefs.contentDocument.forms.namedItem("preferences");

        // Set up form state
        form.elements.namedItem("auto_quick_edit").checked = Uber.Config.getAutoQuickEdit();
        form.elements.namedItem("clean_post_form").checked = Uber.Config.getCleanPostForm();
        form.elements.namedItem("fix_spoilers").checked = Uber.Config.getFixSpoilers();
        form.elements.namedItem("remove_username_menus").checked = Uber.Config.getRemoveUsernameMenus();
        form.elements.namedItem("restore_search_link").checked = Uber.Config.getRestoreSearchLink();
        form.elements.namedItem("tidy_giant_frying_pan").checked = Uber.Config.getTidyGiantFryingPan();
        form.elements.namedItem("tidy_chywuhx").checked = Uber.Config.getTidyChywuhx();
        form.elements.namedItem("tidy_despin").checked = Uber.Config.getTidyDespin();
        form.elements.namedItem("undo_image_resizing").checked = Uber.Config.getUndoImageResizing();

        // Set up event handlers
        form.elements.namedItem("close_button").addEventListener("click", this.hide.bind(this), false);
        form.elements.namedItem("save_button").addEventListener("click", this.savePreferencesHandler.bind(this), false);
    },

    /**
     * Saves preferences.
     */
    savePreferencesHandler: function()
    {
        var form = this.prefs.contentDocument.forms.namedItem("preferences");
        Uber.Config.setAutoQuickEdit(form.elements.namedItem("auto_quick_edit").checked);
        Uber.Config.setCleanPostForm(form.elements.namedItem("clean_post_form").checked);
        Uber.Config.setFixSpoilers(form.elements.namedItem("fix_spoilers").checked);
        Uber.Config.setRemoveUsernameMenus(form.elements.namedItem("remove_username_menus").checked);
        Uber.Config.setRestoreSearchLink(form.elements.namedItem("restore_search_link").checked);
        Uber.Config.setTidyGiantFryingPan(form.elements.namedItem("tidy_giant_frying_pan").checked);
        Uber.Config.setTidyChywuhx(form.elements.namedItem("tidy_chywuhx").checked);
        Uber.Config.setTidyDespin(form.elements.namedItem("tidy_despin").checked);
        Uber.Config.setUndoImageResizing(form.elements.namedItem("undo_image_resizing").checked);
        this.hide();
    }
};

/**
 * Encapsulates access to configuration preferences, providing getters and
 * setters for each preference.
 */
Uber.Config =
{
    init: function()
    {
        this._booleanProperty("autoQuickEdit", false);
        this._booleanProperty("cleanPostForm", false);
        this._booleanProperty("fixSpoilers", false);
        this._booleanProperty("removeUsernameMenus", false);
        this._booleanProperty("restoreSearchLink", false);
        this._booleanProperty("tidyGiantFryingPan", false);
        this._booleanProperty("tidyChywuhx", false);
        this._booleanProperty("tidyDespin", false);
        this._booleanProperty("undoImageResizing", false);
    },

    /**
     * Registers getter and setter functions with the given preference name,
     * with the getter returning the given default value if the preference has
     * not previously been set.
     */
    _booleanProperty: function(name, defaultValue)
    {
        var suffix = name.capFirst();
        this["get" + suffix] = function() { return this._getPreference(name, defaultValue); };
        this["set" + suffix] = function(newValue) { GM_setValue(name, newValue); };
    },

    /**
     * Retrieves a preference, setting it to the given default value and
     * returning the default value if not already set.
     */
    _getPreference: function(name, defaultValue)
    {
        var config = GM_getValue(name);
        if (config === undefined)
        {
            GM_setValue(name, defaultValue);
            config = defaultValue;
        }
        return config;
    }
};

Uber.init();