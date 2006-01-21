// ==UserScript==
// @name        Rllmuk Tidy
// @namespace   http://insin.woaf.net/scripts/
// @description Applies CSS fixes to neaten layout & attempts to tidy up posts
// @include     http://www.rllmukforum.com/*
// ==/UserScript==

(
function()
{
    // Apply CSS
    var css =
'.formbuttonrow div img[src*="p_up.gif"], .formbuttonrow div img[src*="p_card.gif"] { display: none !important; }\
.catend { height: 1px !important; padding: 0 !important; }\
.subtitle { display: none !important; }\
#ipbwrapper + table { display: none !important; }\
#gfooter { display: none !important; }\
body > div:first-child { display: none !important; }\
body > div:first-child + div { display: none !important; }\
.post2 .postdetails br, .post1 .postdetails br { display: none !important; }\
.post1 .postdetails img, .post2 .postdetails img { display: block !important; margin-bottom: 1em !important; }\
.quotetop { border-left: 1px dotted black !important; }\
.quotemain { border-left: 1px dotted black !important; padding-bottom: 0 !important; }';

    head = document.getElementsByTagName("head")[0];
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.innerHTML = css;
    head.appendChild(style);

    // Select all post text
    var textnodes = document.evaluate(
        "//div[@class='postcolor']//text()",
        document,
        null,
        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
        null);

    // If post text was found, attempt to tidy it up
    if (textnodes.snapshotLength > 0)
    {
        var ciReplacements, csReplacements, nonWordReplacements, regex, key, node, s;

        regex = {};

        // Case insensitive replacements
        ciReplacements =
        {
            // Mis-spellings
            "teh":"the",
            "sentance":"sentence",
            "sequal":"sequel",
            "definately":"definitely",
            "arguements":"arguments",
            "rediculous":"ridiculous",
            "grammer":"grammar",

            // Grammar and punctuation
            "would of":"would have",
            "could of":"would have",
            "should of":"should have",
            "must of":"must have",
            "alot":"a lot",
            "infact":"in fact"
        };
        for (key in ciReplacements)
        {
            regex[key] = new RegExp("\\b" + key + "\\b", "i");
        }

        // Case sensitive replacements
        csReplacements =
        {
            // Grammar and punctuation
            "im":"I'm",
            "i'":"I'",
            "^i\\s":"I ",
            "\\si\\s":" I ",
            "\\si$":" I"
        };
        for (key in csReplacements)
        {
            regex[key] = new RegExp("\\b" + key + "\\b");
        }

        // Non-word replacements
        nonWordReplacements =
        {
            "!(?:[!1]|one)+":"!" // Replaces !!11one style exclamations with a single !
        };
        for (key in nonWordReplacements)
        {
            regex[key] = new RegExp(key, "i");
        }

        for (var i = 0; i < textnodes.snapshotLength; i++)
        {
            node = textnodes.snapshotItem(i);
            s = node.data;
            for (key in ciReplacements)
            {
                s = s.replace(regex[key], ciReplacements[key]);
            }
            for (key in csReplacements)
            {
                s = s.replace(regex[key], csReplacements[key]);
            }
            for (key in nonWordReplacements)
            {
                s = s.replace(regex[key], nonWordReplacements[key]);
            }
            node.data = s;
        }
    }
}
)();

/* Acknowledgements
 * ----------------
 * Post tidying section based on DumbQuotes by Mark Pilgrim
 * - http://diveintogreasemonkey.org/casestudy/dumbquotes.html
 * -------------------------------------------------------------------------- */