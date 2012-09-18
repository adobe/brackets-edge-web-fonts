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
/*global require, define, Mustache, $, setTimeout, clearTimeout */


define(function (require, exports, module) {
    "use strict";
    
    // TODO: These URLs are supposedly changing before launch.
    var apiUrlPrefix      = "https://api.typekit.com/edge_internal_v1/",
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
     * Returns a sorted array of all font slugs that contain a case-insensitive version
     * of the needle.
     *
     * The results are sorted as follows:
     *   1. All fonts with a slug that starts with the needle
     *   2. All fonts with a slug part (separated by hyphens) that starts with the needle
     *   3. All fonts with a slug that contain the needle
     * Within each category, fonts are sorted alphabetically
     * 
     * @param {!string} needle - the search term
     * @return {Array.<Object>} Array of font objects that contain the search term.
     */
    function filterAndSortSlugArray(needle, arr) {
        var beginning = [], beginningOfWord = [], contains = [];
        var i, index;
        
        arr = lowerSortUniqStringArray(arr);
        
        var lowerCaseNeedle = needle.toLocaleLowerCase();
        
        for (i = 0; i < arr.length; i++) {
            index = arr[i].indexOf(lowerCaseNeedle);
            if (index === 0) {
                beginning.push(arr[i]);
            } else if (index > 0) {
                var previousChar = arr[i][index - 1];
                if (!previousChar.isAlpha() && !previousChar.isDigit()) {
                    beginningOfWord.push(arr[i]);
                } else {
                    contains.push(arr[i]);
                }
            }
        }
        
        return beginning.concat(beginningOfWord).concat(contains);
    }
    
    /**
     * Returns a sorted array of all fonts that contain a case-insensitive version
     * of the needle.
     *
     * The results are sorted as follows:
     *   1. All fonts with a name that starts with the needle
     *   2. All fonts with a word that starts with the needle
     *   3. All fonts that contain the needle
     * Within each category, fonts are sorted alphabetically
     * 
     * @param {!string} needle - the search term
     * @return {Array.<Object>} Array of font objects that contain the search term.
     */
    function searchByName(needle) {
        var beginning = [], beginningOfWord = [], contains = [];
        var i, index;
        
        var lowerCaseNeedle = needle.toLocaleLowerCase();
        
        for (i = 0; i < allFonts.length; i++) {
            index = allFonts[i].lowerCaseName.indexOf(lowerCaseNeedle);
            if (index === 0) {
                beginning.push(allFonts[i]);
            } else if (index > 0) {
                var previousChar = allFonts[i].lowerCaseName[index - 1];
                if (!previousChar.isAlpha() && !previousChar.isDigit()) {
                    beginningOfWord.push(allFonts[i]);
                } else {
                    contains.push(allFonts[i]);
                }
            }
        }
        
        return beginning.concat(beginningOfWord).concat(contains);
    }
    
    

    function searchBySlug(needle) {
        return filterAndSortSlugArray(needle, getAllSlugs());
    }
    
    function _displayResults(families) {
        function fontClickHandler(event) {
            var d = event.target;

            // walk up the dom until we find something with the data-slug attribute
            while (d && !d.attributes.hasOwnProperty("data-slug")) {
                d = d.parentElement;
            }
            
            if (d) {
                $(".ewf-font.selected").removeClass("selected");
                $(d).addClass("selected");
                $(exports).triggerHandler("ewfFontSelected", d.attributes["data-slug"].value);
            }
        }

        if ($results) {
            $results.empty();
            $results.html(Mustache.render(resultsHtml, {Strings: Strings, families: families}));
            $(".ewf-font").click(fontClickHandler);
        }
    }
    
    function renderPicker(domElement) {
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

                // select this class
                $targetButton.addClass("selected");
                
                console.log("[ewf]", "clicked a classification", classification);
            
                _displayResults(families);
            }
        }
        
        function searchExecutor(query) {
            console.log("[ewf] searching for:", query);
            var fonts = searchByName(query);
            // clear any previously selected class
            $('.ewf-tabs button').removeClass("selected");
            _displayResults(fonts);
        }
        
        function searchHandler(event) {
            var query = $(event.target).val();
            console.log("[ewf] typed:", query);
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
        var i, fontStrings = [];
        for (i = 0; i < fonts.length; i++) {
            fontStrings.push(fonts[i].slug + ":" + fonts[i].fvds.join(",") + ":" + fonts[i].subset);
        }
        return fontIncludePrefix + fontStrings.join(";") + fontIncludeSuffix;
    }
    
    function init(newApiUrlPrefix) {
        var d = $.Deferred();
        
        if (newApiUrlPrefix) {
            apiUrlPrefix = newApiUrlPrefix;
        }
    
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
            allFonts.sort(function (a, b) { return (a.lowerCaseName < b.lowerCaseName ? -1 : 1); });
            
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
        
        return d.promise();
                
    }
    
    exports.lowerSortUniqStringArray = lowerSortUniqStringArray;
    exports.filterAndSortSlugArray = filterAndSortSlugArray;
    exports.getWebsafeFonts = getWebsafeFonts;
    exports.getAllSlugs = getAllSlugs;
    exports.getFontBySlug = getFontBySlug;
    exports.searchByName = searchByName;
    exports.searchBySlug = searchBySlug;
    exports.renderPicker = renderPicker;
    exports.createInclude = createInclude;
    exports.init = init;
    
});
