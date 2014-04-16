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
            (t.type === "property" || t.type === "property error");
                    
    }
    
    function isFontNameToken(t) {
        return t.type === "variable" || t.type === "variable-2" || t.type === "string-2";
    }
    
    function isFontNameStringToken(t) {
        return t.type === "string";
    }
    
    function inRuleBody(t) {
        var context = t.state.context || t.state.localState.context;
        
        return t.type !== "property" &&
            t.type !== "property error" &&
            context.type === "prop";
    }
    
    exports.isFontFamilyToken = isFontFamilyToken;
    exports.isFontNameToken = isFontNameToken;
    exports.isFontNameStringToken = isFontNameStringToken;
    exports.inRuleBody = inRuleBody;
});
