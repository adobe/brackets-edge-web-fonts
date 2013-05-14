/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
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

define(function (require, exports, module) {
    "use strict";

    function isFontFamilyToken(t) {
        return t.string.toLowerCase() === "font-family" &&
            (t.className === "variable" || t.className === "variable error");
                        
    }
    
    function isFontNameToken(t) {
        return t.className === null &&
            t.string.trim().length > 0 &&
            t.string.indexOf(",") === -1 &&
            t.string.indexOf(":") === -1;
    }
    
    function isFontNameStringToken(t) {
        return t.className === "string";
    }
    
    function inRuleBody(t) {
        var stateStack = t.state.stack || t.state.localState.stack;
        
        return t.className !== "variable" &&
            t.className !== "variable error" &&
            stateStack.length > 0 &&
            stateStack[stateStack.length - 1] === "rule";
    }
    
    exports.isFontFamilyToken = isFontFamilyToken;
    exports.isFontNameToken = isFontNameToken;
    exports.isFontNameStringToken = isFontNameStringToken;
    exports.inRuleBody = inRuleBody;
});
