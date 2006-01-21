// ==UserScript==
// @name        GamesRadar Tidy
// @namespace   http://insin.woaf.net/scripts/
// @description Tidies up GamesRadar
// @include     http://gamesradar.msn.co.uk/*
// ==/UserScript==

/*
 * isolate() function from Platypus
 * http://platypus.mozdev.org
 */

(
function()
{
    function isolate(node)
    {
        if (!node.parentNode) return;
        node.parentNode.removeChild(node);
        while (document.body.childNodes.length > 0)
        {
          document.body.removeChild(document.body.childNodes[0]);
        }
        document.body.appendChild(node);
    }
    
    isolate(document.evaluate("/HTML[1]/BODY[1]/TABLE[1]/TBODY[1]/TR[1]/TD[2]/TABLE[1]/TBODY[1]/TR[1]/TD[2]",
                              document,
                              null,
                              XPathResult.FIRST_ORDERED_NODE_TYPE,
                              null).singleNodeValue);

    head = document.getElementsByTagName("head")[0];
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.appendChild(document.createTextNode("html { background-color: #eee !important; }\nbody { background-color: white !important; width: 714px !important; margin: 0 auto; padding: 0 10px; }"));
    head.appendChild(style);
}
)();