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

    "DIALOG_DONE"                    : "Fertig",
    "SEARCH_PLACEHOLDER"             : "Suche",
    "BROWSE_FONTS_INSTRUCTIONS"      : "Suche und wähle die Schrift, die du in dein Webprojekt integrieren möchtest.",
    "CODEHINT_BROWSE"                : "Web-Fonts durchsuchen...", // Needs to be short to fit in popup, but not sure about acronym
    "GENERATE_INCLUDE_TOOLTIP"       : "Generiere Edge Web Fonts Einbettungscode",
    "INCLUDE_INSTRUCTIONS_1"         : "Edge Web Fonts werden mittels JavaScript in den Browser des Nutzers geladen. Um sicherzustellen, dass Schriften richtig geladen werden, musst du einen 'Script-Tag' zu deinem HTML hinzufügen.",
    "INCLUDE_INSTRUCTIONS_2"         : "Kopiere den folgenden 'Script-Tag' und füge ihn in alle HTML-Dateien ein, auf welche sich diese CSS-Datei bezieht:",
    "HOWTO_INSTRUCTIONS_1"           : "Edge Web Fonts bietet dir Zugriff auf eine Bibliothek von Web-Fonts, ermöglicht durch Beiträge von Adobe, Google und Designern auf der ganzen Welt. Die Schriften werden ausgeliefert von Typekit, kostenlos für die Nutzung auf deiner Webseite.",
    "HOWTO_INSTRUCTIONS_2"           : "Beim definieren eines font-family Attributs in einem CSS Dokument, bitte 'Web-Fonts durchsuchen' aus dem Autovervollständigungs-Dialog auswählen um die kostenlosen Web-Fonts zu durchsuchen.",
    "HOWTO_INSTRUCTIONS_3"           : "Wenn du fertig bist, klicke auf das [ Wf ] Icon oben rechts um den benötigten Einbettungscode zu generieren.",
    "HOWTO_INSTRUCTIONS_4"           : "Füge den Einbettungscode in jede HTML-Seite ein um die Fonts zu integrieren.",
    "TERMS_OF_USE"                   : "<a class=\"clickable-link\" data-href=\"http://adobe.com/go/edgewebfonts_tou\">Edge Web Fonts Nutzungsbedingungen</a>",
    "SAMPLE_TEXT"                    : "Beispiel",
    
    // Font classifications
    "serif"                    : "Serif",
    "sans-serif"               : "Sans-Serif",
    "slab-serif"               : "Slab-Serif",
    "script"                   : "Script",
    "blackletter"              : "Gebrochen",
    "monospaced"               : "Monospace",
    "handmade"                 : "Handschrift",
    "decorative"               : "Dekorativ",
    "headings"                 : "Überschriften",
    "paragraphs"               : "Fließtext"
});
