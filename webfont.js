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
/*global brackets, require, define, Mustache, $, setTimeout, clearTimeout */


define(function (require, exports, module) {
    "use strict";
    
    var apiUrlPrefix      = "https://api.typekit.com/edge_internal_v1/",
        appNameInclude    = "", // filled in on init()
        fontIncludePrefix = "<script src=\"http://use.edgefonts.net/",
        fontIncludeSuffix = ".js\"></script>";
    
    var fontsByClass = {},
        fontsByName  = {},
        fontsBySlug  = {},
        allFonts     = [],
        allSlugs     = [];
    
    var pickerHtml     = require("text!htmlContent/ewf-picker.html"),
        resultsHtml    = require("text!htmlContent/ewf-results.html"),
        Strings        = require("strings");
    
    var $picker  = null,
        $results = null;
    
    var fontClassifications = ["serif", "sans-serif", "slab-serif", "script", "blackletter", "monospaced", "handmade", "decorative"],
        fontRecommendations = ["headings", "paragraphs"];

    var websafeFonts = ["andale mono", "arial", "arial black", "comic sans ms", "courier new", "georgia", "impact", "times new roman", "trebuchet ms", "verdana", "sans-serif", "serif"];
    
    var SEARCH_HYSTERESIS = 500; // milliseconds
    var lastSearchTimer = null;
    
    
    function getWebsafeFonts() {
        return websafeFonts.concat([]); // make a copy   
    }
    
    function getAllSlugs() {
        return allSlugs.concat([]); // make a copy           
    }
    
    /**
     * Returns font object matching specified slug or 'undefined' if not found
     *
     * @param {!string} slug - the slug of the desired font
     * @return {object} font object, or undefined if not found
     */
    function getFontBySlug(slug) {
        return fontsBySlug[slug.toLowerCase()];
    }
    
    /**
     * Returns a copy of arr that is a.) all lowercase, b.) sorted lexigraphically,
     * and c.) has all duplicates removed.
     *
     * @param {!Array.<string>}
     * @return {Array.<string>}
     */
    function lowerSortUniqStringArray(arr) {
        var i, last = null, lowerArr = [], result = [];
        // fill up the lowerArr array with lowercase versions of the source array
        for (i = 0; i < arr.length; i++) {
            if (typeof arr[i] === "string") {
                lowerArr.push(arr[i].toLowerCase());
            }
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
    
    /**
     * Returns a sorted array of all the elements in arr that contain a case-insensitive 
     * version of the needle. The array returned is a new array. The original arry is not
     * modified.
     *
     * The results are sorted as follows:
     *   1. All elements with a name that starts with the needle
     *   2. All elements with a word that starts with the needle
     *   3. All elements that contain the needle
     * Within each category, elements are sorted alphabetically
     *
     * TODO: We should eventually move this search algorithm (and probably the lowerSortUniqStringArray)
     * to core brackets code. It would likely be useful for things like Quick Open.
     *
     * @param {!string} needle - the search term
     * @param {Array} arr - the array to filter and sort
     * @param {function} stringGetterFunction - optional function to extract the sort
     *                   term from each element in the array
     * @return {Array.<Object>} Array of font objects that contain the search term.
     */
    function filterAndSortArray(needle, arr, stringGetterFunction) {
        var beginning = [], beginningOfWord = [], contains = [];
        var i, index, currentString;
        
        var lowerCaseNeedle = needle.toLocaleLowerCase();
        
        if (!stringGetterFunction) {
            // If a function for getting the string out of each array object
            // isn't provided, just use whatever value is in the array as the string
            stringGetterFunction = function (s) { return String(s); };
        }
        
        for (i = 0; i < arr.length; i++) {
            currentString = stringGetterFunction(arr[i]).toLocaleLowerCase();
            index = currentString.indexOf(lowerCaseNeedle);
            if (index === 0) {
                beginning.push(arr[i]);
            } else if (index > 0) {
                var previousChar = currentString[index - 1];
                if (!previousChar.isAlpha() && !previousChar.isDigit()) {
                    beginningOfWord.push(arr[i]);
                } else {
                    contains.push(arr[i]);
                }
            }
        }
        
        return beginning.concat(beginningOfWord).concat(contains);
    }
    
    function searchByName(needle) {
        if (needle === "") {
            return [];
        } else {
            return filterAndSortArray(needle, allFonts, function (f) { return f.lowerCaseName; });
        }
    }
    
    function searchBySlug(needle) {
        if (needle === "") {
            return [];
        } else {
            return filterAndSortArray(needle, getAllSlugs());
        }
    }
    
    function _displayResults(families) {
        function fontClickHandler(event) {
            var d = event.target;

            // walk up the dom until we find something with the data-slug attribute
            while (d && !d.attributes.hasOwnProperty("data-slug")) {
                d = d.parentElement;
            }
            
            if (d) {
                d.focus();
                $(".ewf-font.selected").removeClass("selected");
                $(d).addClass("selected");
                $(exports).triggerHandler("ewfFontSelected", d.attributes["data-slug"].value);
            }
        }
        
        function fontDoubleClickHandler(event) {
            fontClickHandler(event);
            $(exports).triggerHandler("ewfFontChosen");
        }

        if ($results) {
            families.forEach(function (elem, index) {
                // tabindex starts at one
                elem.index = index + 1;
            });
            
            $results.empty();
            $results.html(Mustache.render(resultsHtml, {Strings: Strings, families: families}));
            $(".ewf-font").click(fontClickHandler)
                .focus(fontClickHandler)
                .dblclick(fontDoubleClickHandler);
        }
    }
    
    function renderPicker($dlg) {
        var domElement = $dlg.find(".edge-web-fonts-browse-dialog-body")[0];
        var localizedClassifications = [];
        var localizedRecommendations = [];
        var i;
                
        function classificationClickHandler(event) {
            var $targetButton = $(event.target);
            while ($targetButton.length > 0 && !$targetButton.attr("data-classification")) {
                $targetButton = $targetButton.parent();
            }
            if ($targetButton.length > 0) {
                var classification = $targetButton.attr("data-classification");
                var families = fontsByClass[classification];
            
                // clear previously selected class
                $(".ewf-tabs button").removeClass("selected");

                // clear any previous search
                $(".ewf-search-fonts").val("");
                
                // select this class
                $targetButton.addClass("selected");
                            
                _displayResults(families);
            }
        }
        
        function searchExecutor(query) {
            var fonts = searchByName(query);
            // clear any previously selected class
            $('.ewf-results button').removeClass("selected");
            
            if (fonts.length > 0) {
                _displayResults(fonts);
            } else {
                var $button = $(".ewf-side-bar button.selected"),
                    classification = $button.attr("data-classification");
                fonts = fontsByClass[classification];
                _displayResults(fonts);
            }
        }
        
        function searchHandler(event) {
            var query = $(event.target).val();
            if (lastSearchTimer) {
                clearTimeout(lastSearchTimer);
            }
            lastSearchTimer = setTimeout(function () { searchExecutor(query); }, SEARCH_HYSTERESIS);
            
            
        }
        
        // map font classifications to their localized names:
        for (i = 0; i < fontClassifications.length; i++) {
            localizedClassifications.push({className: fontClassifications[i], localizedName: Strings[fontClassifications[i]]});
        }

        // map font classifications to their localized names:
        for (i = 0; i < fontRecommendations.length; i++) {
            localizedRecommendations.push({className: fontRecommendations[i], localizedName: Strings[fontRecommendations[i]]});
        }
        
        $picker = $(Mustache.render(pickerHtml, {Strings: Strings, localizedClassifications: localizedClassifications, localizedRecommendations: localizedRecommendations}));
        $(domElement).append($picker);
        
        // set the dialog's OK button to have a very large tabindex so that it
        // will only gain focus after tabbing past the last font result
        $dlg.find(".dialog-button").attr("tabindex", 99999);
        
        // prevent tabbing in front of the search input
        $dlg.find(".ewf-search-fonts").on("keydown", function (event) {
            if (event.shiftKey && event.keyCode === 9) {
                event.preventDefault();
            }
        });

        $(".ewf-tabs button", $picker).click(classificationClickHandler);
        
        $('.ewf-tabs .ewf-search-fonts', $picker).on("keyup", searchHandler);
        
        $results = $(".ewf-results", $picker);

        $('.font-classifications button:first').trigger('click');
    }
    
    /**
     * Generates the script tag for including the specified fonts.
     *
     * @param {!Array} fonts - should be an array of objects, and each object 
     *      should have the following properties:
     *        slug - string specifying the unique slug of the font (e.g. "droid-sans")
     *        fvds - array of variant strings (e.g. ["n4", "n7"])
     *        subset - string specifying the subset desired (e.g. "default")
     *
     */
    function createInclude(fonts) {
        var i, fontStrings = [], fontString;
        for (i = 0; i < fonts.length; i++) {
            fontString = fonts[i].slug;
            if (fonts[i].fvds) {
                fontString += ":" + fonts[i].fvds.join(",");
            }
            if (fonts[i].subset) {
                fontString += ":" + fonts[i].subset;
            }
            fontStrings.push(fontString);
        }
        return appNameInclude + fontIncludePrefix + fontStrings.join(";") + fontIncludeSuffix;
    }
    
    function init(newApiUrlPrefix) {
        var d = $.Deferred();
        
        if (newApiUrlPrefix) {
            apiUrlPrefix = newApiUrlPrefix;
        }
    
        // setup callback function for metadata request
        function organizeFamilies(families) {
            allFonts = families.families;
            var i, j;
            
            // Clean up the fonts in two ways:
            //   1. give all fonts a locale lowercase name (for searching by name)
            //   2. make sure all slugs are lowercase (should be the case already)
            for (i = 0; i < allFonts.length; i++) {
                allFonts[i].lowerCaseName = allFonts[i].name.toLocaleLowerCase();
                allFonts[i].slug = allFonts[i].slug.toLowerCase();
            }
            
            // We keep allFonts in alphabetical order by name, so that all other
            // lists will also be in order.
            allFonts.sort(function (a, b) {
                if (a.lowerCaseName < b.lowerCaseName) {
                    return -1;
                } else if (a.lowerCaseName > b.lowerCaseName) {
                    return 1;
                } else { // they're equal
                    return 0;
                }
            });
            
            // setup the allSlugs array;
            for (i = 0; i < allFonts.length; i++) {
                allSlugs.push(allFonts[i].slug);
            }
            
            fontsByClass = {};
            fontsByName = {};
            fontsBySlug = {};
            
            for (i = 0; i < allFonts.length; i++) {
                for (j = 0; j < allFonts[i].classifications.length; j++) {
                    if (!fontsByClass.hasOwnProperty(allFonts[i].classifications[j])) {
                        fontsByClass[allFonts[i].classifications[j]] = [];
                    }
                    fontsByClass[allFonts[i].classifications[j]].push(allFonts[i]);
                }
                for (j = 0; j < allFonts[i].recommended_for.length; j++) {
                    if (!fontsByClass.hasOwnProperty(allFonts[i].recommended_for[j])) {
                        fontsByClass[allFonts[i].recommended_for[j]] = [];
                    }
                    fontsByClass[allFonts[i].recommended_for[j]].push(allFonts[i]);
                }
                
                
                fontsByName[allFonts[i].name] = allFonts[i];
                fontsBySlug[allFonts[i].slug] = allFonts[i];
            }
        }
        
        // request font metadata
        $.ajax({
            url: apiUrlPrefix + "families",
            dataType: 'json',
            success: function (data) {
                organizeFamilies(data);
                d.resolve();
            },
            error: function () {
                d.reject("XHR request to 'families' API failed");
            }
        });
        
        // set up include strings
        var appId = "";
        try {
            // Check if we're running inside Edge Code or Brackets
            // We do this in a 'try' because we don't want this to break horribly if the place we keep the
            // app name changes. Also, we want it to work if we switch from "Edge Code" to "Adobe Edge Code" etc, 
            // so we look at the lowercase version of the last word in the name
            appId = brackets.metadata.name.split(" ").pop().toLowerCase();
            if (appId === "code") {
                appNameInclude = "<script>var __adobewebfontsappname__ = \"code\"</script>\n";
            }
        } catch (err) {
            // Do nothing. Include generation will still work even if we don't get an app identifier.
        }
        
        return d.promise();
                
    }
    
    exports.lowerSortUniqStringArray = lowerSortUniqStringArray;
    exports.filterAndSortArray = filterAndSortArray;
    exports.getWebsafeFonts = getWebsafeFonts;
    exports.getAllSlugs = getAllSlugs;
    exports.getFontBySlug = getFontBySlug;
    exports.searchByName = searchByName;
    exports.searchBySlug = searchBySlug;
    exports.renderPicker = renderPicker;
    exports.createInclude = createInclude;
    exports.init = init;
    
});
