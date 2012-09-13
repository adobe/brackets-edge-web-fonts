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
/*global define, brackets, $, window, Mustache, less, setTimeout */

define(function (require, exports, module) {
    "use strict";
    
    var webfont                 = require("core/webfont"),
        parser                  = require("cssFontParser"),
        ewfBrowseDialogHtml     = require("text!ewf-browse-dialog.html"),
        ewfIncludeDialogHtml    = require("text!ewf-include-dialog.html"),
        ewfToolbarHtml          = require("text!ewf-toolbar.html"),
        ewfCodeHintAdditionHtml = require("text!ewf-codehint-addition.html"),
        Strings                 = require("core/strings");
    
    
    var AppInit         = brackets.getModule("utils/AppInit"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
        StringUtils     = brackets.getModule("utils/StringUtils"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        EditorUtils     = brackets.getModule("editor/EditorUtils"),
        CodeHintManager = brackets.getModule("editor/CodeHintManager"),
        CommandManager  = brackets.getModule("command/CommandManager"),
        Commands        = brackets.getModule("command/Commands"),
        Dialogs         = brackets.getModule("widgets/Dialogs"),
        Menus           = brackets.getModule("command/Menus");

    var $toolbarIcon = null;

    // Because of the way pop ups wor, we need to create a new code hint addition every time 
    // we have a new popup. But, we only need to render the HTML once.
    var codeHintAdditionHtmlString = Mustache.render(ewfCodeHintAdditionHtml, Strings);
    
    // commands
    var COMMAND_BROWSE_FONTS = "edgewebfonts.browsefonts";
    var COMMAND_GENERATE_INCLUDE = "edgewebfonts.generateinclude";
        
    function _documentIsCSS(doc) {

        return ((doc !== null) &&
                (doc !== undefined) &&
                (EditorUtils.getModeFromFileExtension(doc.file.fullPath) === "css"));
    }
    
    /** Adds an option to browse EWF to the bottom of the code hint list
     *
     *  TODO: Add an API to either CodeHintManager or PopUpManager so that we
     *  can add UI in a much cleaner way. Once we do that, clean up the
     *  LESS so that we aren't overriding core brackets LESS (e.g. to change
     *  the code hint border).
     *
     *  NOTE: It is **required** that we have a CSS rule that causes the DOM elements
     *  here to be hidden when the menu does *not* have the "open" class applied.
     *  This is because PopUpManager checks whether a popup is closed by checking if 
     *  it has any visible children. PopUps don't always get removed from the DOM right 
     *  when they're closed. If we don't have this rule we get infinite recursion in PopUpManager.
     */
    function _augmentCodeHintUI() {
        var $menu = $(".dropdown.codehint-menu.open");
        if ($menu.length > 0) {
            var $menuList = $menu.find(".dropdown-menu");
            if ($menuList.length > 0) { // we're actually displaying a code hint
                var $codeHintAddition = $menu.find(".ewf-codehint-addition");
                
                // If this is a new popup, we won't have a code hint addition yet (new popup), 
                // so create it first
                if ($codeHintAddition.length === 0) {
                    $codeHintAddition = $(codeHintAdditionHtmlString);
                    $menuList.after($codeHintAddition);
                    $codeHintAddition.find('a').on('click', function () {
                        CommandManager.execute(COMMAND_BROWSE_FONTS);
                        return false; // don't actually follow link
                    });
                }

                // This method only gets called when the pop up has changed in some way
                // (e.g. a new search). So, the popup has always moved. We need to reposition.
                var menuListPosition = $menuList.position();
                $codeHintAddition.css("position", "absolute");
                $codeHintAddition.css("top", menuListPosition.top + $menuList.height());
                $codeHintAddition.css("left", menuListPosition.left);
                $codeHintAddition.css("width", $menuList.width());
                $codeHintAddition.css("max-width", $menuList.width());
            }
        }
    }
    
    /**
     * @constructor
     */
    function FontHints() {}

    /**
     * Filters the source list by query and returns the result
     * @param {Object.<queryStr: string, ...} query -- a query object with a required property queryStr 
     *     that will be used to filter out code hints
     * @return {Array.<string>}
     */
    FontHints.prototype.search = function (query) {
        return webfont.searchBySlug(query.queryStr);
        
    };


    /**
     * Figures out the text to use for the hint list query based on the text
     * around the cursor
     * Query is the text from the start of a tag to the current cursor position
     * @param {Editor} editor
     * @param {Cursor} current cursor location
     * @return {Object.<queryStr: string, ...} search query results will be filtered by.
     *      Return empty queryStr string to indicate code hinting should not filter and show all results.
     *      Return null in queryStr to indicate NO hints can be provided.
     */
    FontHints.prototype.getQueryInfo = function (editor, cursor) {
        var queryInfo = {queryStr: null}; // by default, don't handle
        var token = null;
        
        if (_documentIsCSS(editor.document)) {
            token = parser.getFontTokenAtCursor(editor, cursor);
            if (token) {
                if (token.className === "string") { // is wrapped in quotes        
                    if (token.start < cursor.ch) { // actually in the text
                        queryInfo.queryStr = token.string.substring(1, cursor.ch - token.start);
                        if (token.end === cursor.ch) { // at the end, so need to clip off closing quote
                            queryInfo.queryStr = queryInfo.queryStr.substring(0, queryInfo.queryStr.length - 1);
                        }
                    } else { // not in the text
                        queryInfo.queryStr = "";
                    }
                    console.log("[ewf] in string, decided on '" + queryInfo.queryStr + "'");
                } else if (token.className === "number") { // is not wrapped in quotes
                    queryInfo.queryStr = token.string.substring(0, cursor.ch - token.start);
                    console.log("[ewf] in number, decided on '" + queryInfo.queryStr + "'");
                } else { // after a ":", a space, or a ","
                    queryInfo.queryStr = "";
                    console.log("[ewf] not in string or number, decided on '" + queryInfo.queryStr + "'");
                }
            }
        }
        
        // we're going to handle this query, so we need to add our UI
        if (queryInfo.queryStr !== null) {
            setTimeout(_augmentCodeHintUI, 1);
        }
        
        return queryInfo;
    };

    /**
     * Enters the code completion text into the editor
     * @param {string} completion - text to insert into current code editor
     * @param {Editor} editor
     * @param {Cursor} current cursor location
     */
    FontHints.prototype.handleSelect = function (completion, editor, cursor) {
        var token;
        var actualCompletion = completion;
        var stringChar = "";
        
        console.log("[ewf] completed", completion);
        if (_documentIsCSS(editor.document)) { // on the off-chance we changed documents, don't change anything
            token = parser.getFontTokenAtCursor(editor, cursor);
            if (token) {
                if (token.className === "string") {
                    stringChar = token.string.substring(0, 1);
                    actualCompletion = stringChar + actualCompletion + stringChar;
                }
                
                if (token.className === "string" || token.className === "number") { // replace
                    editor.document.replaceRange(actualCompletion,
                                                 {line: cursor.line, ch: token.start},
                                                 {line: cursor.line, ch: token.end});
                } else { // insert
                    editor.document.replaceRange(actualCompletion, cursor);
                }
            }
        }
    };

    /**
     * Check whether to show hints on a specific key.
     * @param {string} key -- the character for the key user just presses.
     * @return {boolean} return true/false to indicate whether hinting should be triggered by this key.
     */
    FontHints.prototype.shouldShowHintsOnKey = function (key) {
        return false;
    };
    
        
    function init() {
        /** Finds this extension's directory relative to the brackets root */
        function _extensionDirForBrowser() {
            var bracketsIndex = window.location.pathname;
            var bracketsDir   = bracketsIndex.substr(0, bracketsIndex.lastIndexOf('/') + 1);
            var extensionDir  = bracketsDir + require.toUrl('./');
    
            return extensionDir;
        }
    
        /** Loads a less file as CSS into the document */
        function _loadLessFile(file, dir) {
            // Load the Less code
            $.get(dir + file, function (code) {
                // Parse it
                var parser = new less.Parser({ filename: file, paths: [dir] });
                parser.parse(code, function onParse(err, tree) {
                    console.assert(!err, err);
                    // Convert it to CSS and append that to the document head
                    $("<style>").text(tree.toCSS()).appendTo(window.document.head);
                });
            });
        }

        function _handleBrowseFonts() {
            Dialogs.showModalDialog("edge-web-fonts-browse-dialog");
            webfont.renderPicker($('.instance .edge-web-fonts-browse-dialog-body')[0]);
        }
        
        /** Determins what font slugs are in the CSS file and generates the appropriate
         *  data to build the include string. Then, displays the string in a dialog
         *  The actual generation of the string is handled by a core API function
         *
         *  TODO: Right now, we just generate the maximal include string using all
         *  FVDs for a font and the "all" character subset. Long term, we should have a
         *  configurator UI that lets users specify which variants and subsets they want
         */
        function _handleGenerateInclude() {
            var fonts = parser.parseCurrentFullEditor();
            var fontFamilies = [], allFvds = [];
            var i, j, f;
            var includeString = "";
            
            console.log("[ewf] found these fonts", fonts);
            for (i = 0; i < fonts.length; i++) {
                f = webfont.getFontBySlug(fonts[i]);
                if (f) {
                    allFvds = [];
                    for (j = 0; j < f.variations.length; j++) {
                        allFvds.push(f.variations[j].fvd);
                    }
                    fontFamilies.push({slug: f.slug, fvds: allFvds, subset: "all"});
                }
            }
            
            includeString = webfont.createInclude(fontFamilies);
            Dialogs.showModalDialog("edge-web-fonts-include-dialog");
            $('.instance .ewf-include-string').html(StringUtils.htmlEscape(includeString)).focus().select();
        }

        function _handleToolbarClick() {
            CommandManager.execute(COMMAND_GENERATE_INCLUDE);
        }
        
        function _handleDocumentChange() {
            var doc = DocumentManager.getCurrentDocument();
            // doc will be null if there's no active document (user closed all docs)
            if (doc && _documentIsCSS(doc)) {
                $toolbarIcon.addClass("active");
                $toolbarIcon.on("click", _handleToolbarClick);
            } else {
                $toolbarIcon.removeClass("active");
                $toolbarIcon.off("click", _handleToolbarClick);
            }
        }
        
        // install autocomplete handler
        var fontHints = new FontHints();
        CodeHintManager.registerHintProvider(fontHints);
        
        // load styles
        _loadLessFile("ewf-brackets.less", _extensionDirForBrowser());
        ExtensionUtils.loadStyleSheet(module, "core/styles/popover.css");
        ExtensionUtils.loadStyleSheet(module, "core/styles/fontchooser.css");
        
        
        // register commands
        CommandManager.register(Strings.BROWSE_FONTS_COMMAND_NAME, COMMAND_BROWSE_FONTS, _handleBrowseFonts);
        CommandManager.register(Strings.GENERATE_INCLUDE_COMMAND_NAME, COMMAND_GENERATE_INCLUDE, _handleGenerateInclude);
        
        // set up menu and keybinding
        /* NOTE: Decided not to have menu items for now. Leaving this code in case we want to add them back
        var menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);
        menu.addMenuItem(COMMAND_BROWSE_FONTS, "Ctrl-Alt-B", Menus.AFTER, Commands.EDIT_LINE_COMMENT);
        menu.addMenuItem(Menus.DIVIDER, null, Menus.BEFORE, COMMAND_BROWSE_FONTS);
        */

        // set up toolbar icon
        $toolbarIcon = $(Mustache.render(ewfToolbarHtml, Strings));
        $("#main-toolbar .buttons").append($toolbarIcon);
        
        // add event handler to enable/disable the webfont toolbar icon
        $(DocumentManager).on("currentDocumentChange", _handleDocumentChange);
        _handleDocumentChange(); // set to appropriate state for curret doc
        
        // add dialogs to dom
        $('body').append($(Mustache.render(ewfBrowseDialogHtml, Strings)));
        $('body').append($(Mustache.render(ewfIncludeDialogHtml, Strings)));
    }

    // load everything when brackets is done loading
    AppInit.appReady(function () {
        webfont.init()
            .done(init) // only register commands if the core loaded properly
            .fail(function (err) {
                // TODO: Should probably keep trying at some interval -- may have failed because not connected to net
                console.log("[edge-web-font extension] failed to initialize: " + err);
            });
    });
});