// ==UserScript==
// @name           HMV Music Player Fixer
// @namespace      http://www.jonathanbuchanan.plus.com/repos/greasemonkey/
// @description    Fixes the function used to control the music player
// @include        http://hmv.co.uk/*
// @include        http://www.hmv.co.uk/*
// ==/UserScript==
(
    function()
    {
        if (typeof(unsafeWindow.playClip) == "function")
        {
            unsafeWindow.playClip = function(url)
            {
                unsafeWindow.document.clipstream.stop_audio();
                unsafeWindow.document.clipstream.set_audiostreamurl(0, url + ".32");
                unsafeWindow.document.clipstream.play_audio();
            }
        }
    }
)();
