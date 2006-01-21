// ==UserScript==
// @name          Eurogamer Tidy
// @namespace     http://insin.woaf.net/scripts/
// @description   Tidies up the redesigned eurogamer.net
// @include       http://eurogamer.net/*
// @include       http://www.eurogamer.net/*
// @include       http://195.157.98.220/*
// ==/UserScript==

(
    function()
    {
        head = document.getElementsByTagName("head")[0];
        style = document.createElement("style");
        style.setAttribute("type", "text/css");
        style.appendChild(document.createTextNode("#banner, #extra, #toolBar, div.mpuAd, i.comC, p.nologinComments { display: none; }\n#browserMaster { margin: -26px auto 0 auto; width: 800px; }"));
        head.appendChild(style);
    }
)();