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
/*global define, brackets */

define(function (require, exports, module) {
    "use strict";
    
    var EditorManager = brackets.getModule("editor/EditorManager");
    
    /**
     * Returns a copy of arr that is a.) all lowercase, b.) sorted lexigraphically,
     * and c.) has all duplicates removed.
     *
     * @param {!Array.<string>}
     * @return {Array.<string>}
     */
    function _lowerSortUniqStringArray(arr) {
        var i, last = null, lowerArr = [], result = [];
        // fill up the lowerArr array with lowercase versions of the source array
        for (i = 0; i < arr.length; i++) {
            lowerArr.push(arr[i].toLowerCase());
        }
        
        // sort lowerArr alphabetically
        lowerArr.sort();
        
        // copy unique elements to result array
        for (i = 0; i < lowerArr.length; i++) {
            if (lowerArr[i] !== last) {
                result.push(lowerArr[i]);
                last = lowerArr[i];
            }
        }
        
        return result;
    }
    
    function parseCurrentFullEditor() {
        var cm = EditorManager.getCurrentFullEditor()._codeMirror;
        var cursor = {ch: 0, line: 0}, t;
        var isParsingFontList = false;
        
        var fonts = [];
        
        while (cm.getLine(cursor.line) !== undefined) {
            t = cm.getTokenAt(cursor);
            if (t.end < cursor.ch) {
                // We already parsed this token because our cursor is past
                // the token that codemirror gave us. So, we're at end of line.
                cursor.line += 1;
                cursor.ch = 0;
            } else {
                // A new token!
                if (!isParsingFontList &&
                        t.className === "variable" &&
                        t.string.toLowerCase() === "font-family") {
                    isParsingFontList = true;
                } else if (isParsingFontList) {
                    if (t.string === ";") {
                        isParsingFontList = false;
                    } else if (t.className === "number") {
                        fonts.push(t.string);
                    } else if (t.className === "string") {
                        // string token types still have quotes around them, so strip first/last char
                        fonts.push(t.string.substring(1, t.string.length - 1));
                    }
                }
                // Advance to next token (or possibly to the end of the line)
                cursor.ch = t.end + 1;
            }
        }
        
        return _lowerSortUniqStringArray(fonts);
    }
    
    exports.parseCurrentFullEditor = parseCurrentFullEditor;
    
});