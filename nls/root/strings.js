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
    "PRODUCT_NAME"                   : "Adobe Edge Web Fonts",

    "DIALOG_DONE"                    : "Done",
    "SEARCH_PLACEHOLDER"             : "Search",
    "BROWSE_FONTS_INSTRUCTIONS"      : "Browse for and select the web font you wish to include in your web project.",
    "CODEHINT_BROWSE"                : "Browse Web Fonts...", // Needs to be short to fit in popup, but not sure about acronym
    "GENERATE_INCLUDE_TOOLTIP"       : "Generate Edge Web Fonts Embed Code",
    "INCLUDE_INSTRUCTIONS_1"         : "Edge Web Fonts are loaded into the user's browser via JavaScript. To ensure that fonts are properly loaded, you must add a script tag to your HTML.",
    "INCLUDE_INSTRUCTIONS_2"         : "Copy the following script tag and paste it into all HTML files that reference this CSS file:",
    "HOWTO_INSTRUCTIONS_1"           : "Edge Web Fonts lets you add FREE and awesome fonts to your web project. Just specify the fonts you want to use in your CSS and we'll generate the required <script> tag for your HTML.",
    "HOWTO_INSTRUCTIONS_2"           : "When specifying a font-family property in a CSS document, select 'Browse Web Fonts' from the code completion drop-down to browse for free online web fonts.",
    "HOWTO_INSTRUCTIONS_3"           : "When you're done, click the [ Wf ] icon in the top right to generate the required embed code.",
    "HOWTO_INSTRUCTIONS_4"           : "Paste the embed code into any HTML page to include the fonts.",
    "TERMS_OF_USE"                   : "Edge Web Fonts <a class=\"clickable-link\" data-href=\"http://adobe.com/go/edgewebfonts_tou\">Terms of Use</a>",
    "SAMPLE_TEXT"                    : "Sample", // FUTURE: To be used to render "Sample" font previews as shown in http://bit.ly/YdStz9
    
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
