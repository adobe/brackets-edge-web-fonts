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
/*global define, brackets, $, window, Mustache, less */

define(function (require, exports, module) {
    "use strict";
    
    var webfont               = require("core/webfont"),
        parser                = require("cssFontParser"),
        ewfBrowseDialogHtml   = require("text!ewf-browse-dialog.html"),
        ewfIncludeDialogHtml  = require("text!ewf-include-dialog.html"),
        ewfToolbarHtml        = require("text!ewf-toolbar.html"),
        Strings               = require("core/strings");
    
    
    var AppInit         = brackets.getModule("utils/AppInit"),
        StringUtils     = brackets.getModule("utils/StringUtils"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        EditorUtils     = brackets.getModule("editor/EditorUtils"),
        CodeHintManager = brackets.getModule("editor/CodeHintManager"),
        CommandManager  = brackets.getModule("command/CommandManager"),
        Commands        = brackets.getModule("command/Commands"),
        Dialogs         = brackets.getModule("widgets/Dialogs"),
        Menus           = brackets.getModule("command/Menus");

    var $toolbarIcon = null;
    
    // commands
    var COMMAND_BROWSE_FONTS = "edgewebfonts.browsefonts";
        
    function _documentIsCSS(doc) {

        return ((doc !== null) &&
                (doc !== undefined) &&
                (EditorUtils.getModeFromFileExtension(doc.file.fullPath) === "css"));
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
        
        // TODO: This should be factored into a command
        function _handleToolbarClick() {
            var fonts = parser.parseCurrentFullEditor();
            var fontFamilies = [];
            var i, f;
            var includeString = "";
            
            console.log("[ewf] found these fonts", fonts);
            for (i = 0; i < fonts.length; i++) {
                f = webfont.getFontBySlug(fonts[i]);
                if (f) {
                    // TODO: Actually do something with the FVDs
                    fontFamilies.push({slug: f.slug, fvds: [f.variations[0].fvd], subset: "default"});
                }
            }
            
            Dialogs.showModalDialog("edge-web-fonts-include-dialog");
            includeString = webfont.createInclude(fontFamilies);
            $('.instance .ewf-include-string').html(StringUtils.htmlEscape(includeString)).focus().select();
            console.log("[ewf] the include: ", webfont.createInclude(fontFamilies));
            
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
        
        // register commands
        CommandManager.register(Strings.MENU_BROWSE_FONTS, COMMAND_BROWSE_FONTS, _handleBrowseFonts);
    
        // set up menu and keybinding
        var menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);
        menu.addMenuItem(COMMAND_BROWSE_FONTS, "Ctrl-Alt-B", Menus.AFTER, Commands.EDIT_LINE_COMMENT);
        menu.addMenuItem(Menus.DIVIDER, null, Menus.BEFORE, COMMAND_BROWSE_FONTS);

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