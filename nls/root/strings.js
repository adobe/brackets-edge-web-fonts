/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define */

define({
    "PRODUCT_NAME"                   : "Edge Web Fonts",

    "DIALOG_DONE"                    : "Done",
    "CANCEL"                         : "Cancel",
    "SEARCH_PLACEHOLDER"             : "Search",
    "BROWSE_FONTS_INSTRUCTIONS"      : "Browse for and select the web font you wish to include in your web project.",
    "CODEHINT_BROWSE"                : "Browse Web Fonts...", // Needs to be short to fit in popup, but not sure about acronym
    "GENERATE_INCLUDE_TOOLTIP"       : "Generate Edge Web Fonts Embed Code",
    "WEBFONTS_OFFLINE"               : "The Edge Web Fonts extension is disabled because the Web Fonts server cannot be reached. Please check your internet connection or try again later.",
    "INCLUDE_INSTRUCTIONS"           : "To ensure the fonts on your site load correctly, add this script tag to the <code>&lt;head&gt;</code> of any HTML files that reference this CSS file.",
    "HOWTO_INSTRUCTIONS_1"           : "Edge Web Fonts gives you access to a library of web fonts made possible by contributions from Adobe, Google, and designers around the world. The fonts are served by Typekit, free for use on your website.",
    "HOWTO_INSTRUCTIONS_2"           : "When specifying a font-family property in a CSS document, select 'Browse Web Fonts' from the code completion drop-down to browse for free online web fonts.",
    "HOWTO_INSTRUCTIONS_3"           : "When you're done, click the <div class='instructions-icon'></div> icon in the top right to generate the required embed code.",
    "HOWTO_INSTRUCTIONS_4"           : "Paste the embed code into any HTML page to include the fonts.",
    "HOWTO_DIAGRAM_IMAGE"            : "img/ewf-howto-dialog-en.png",
    "HOWTO_DIAGRAM_IMAGE_HIDPI"      : "img/ewf-howto-dialog-en@2x.png",
    "TERMS_OF_USE"                   : "<a href='http://adobe.com/go/edgewebfonts_tou'>Edge Web Fonts Terms of Use</a>",
    "SAMPLE_TEXT"                    : "Sample",
    
    // Font classifications
    "serif"                    : "Serif",
    "sans-serif"               : "Sans-Serif",
    "slab-serif"               : "Slab-Serif",
    "script"                   : "Script",
    "blackletter"              : "Blackletter",
    "monospaced"               : "Monospaced",
    "handmade"                 : "Handmade",
    "decorative"               : "Decorative",
    "headings"                 : "Headings",
    "paragraphs"               : "Paragraphs"
});
