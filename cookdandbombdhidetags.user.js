// ==UserScript==
// @name        Cook'd and Bomb'd Hide Tags
// @description Hides tags under topic pages
// @namespace   https://github.com/insin/greasemonkey/
// @version     1
// @match       https://www.cookdandbombd.co.uk/forums/index.php/topic*
// ==/UserScript==

let $style = document.createElement('style')
$style.textContent = '#main_content_section .pagesection + .largepadding { display: none; }'
document.head.appendChild($style)
