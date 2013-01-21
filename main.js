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
    
    // Modules
    var webfont                 = require("webfont"),
        parser                  = require("cssFontParser"),
        ewfBrowseDialogHtml     = require("text!htmlContent/ewf-browse-dialog.html"),
        ewfIncludeDialogHtml    = require("text!htmlContent/ewf-include-dialog.html"),
        ewfHowtoDialogHtml      = require("text!htmlContent/ewf-howto-dialog.html"),
        ewfToolbarHtml          = require("text!htmlContent/ewf-toolbar.html"),
        ewfCodeHintAdditionHtml = require("text!htmlContent/ewf-codehint-addition.html"),
        Strings                 = require("strings");

    var AppInit                 = brackets.getModule("utils/AppInit"),
        ExtensionUtils          = brackets.getModule("utils/ExtensionUtils"),
        StringUtils             = brackets.getModule("utils/StringUtils"),
        DocumentManager         = brackets.getModule("document/DocumentManager"),
        EditorManager           = brackets.getModule("editor/EditorManager"),
        EditorUtils             = brackets.getModule("editor/EditorUtils"),
        PreferencesManager      = brackets.getModule("preferences/PreferencesManager"),
        CodeHintManager         = brackets.getModule("editor/CodeHintManager"),
        CommandManager          = brackets.getModule("command/CommandManager"),
        Commands                = brackets.getModule("command/Commands"),
        Dialogs                 = brackets.getModule("widgets/Dialogs"),
        Menus                   = brackets.getModule("command/Menus");
    
    // DOM elements and HTML
    var $toolbarIcon = null;
    // Because of the way pop ups work, we need to create a new code hint addition every time 
    // we have a new popup. But, we only need to render the HTML once.
    var codeHintAdditionHtmlString = Mustache.render(ewfCodeHintAdditionHtml, Strings);
    
    var Paths = {
        ROOT : require.toUrl('./')
    };
    
    // Commands & Prefs Strings
    var COMMAND_BROWSE_FONTS = "edgewebfonts.browsefonts";
    var COMMAND_GENERATE_INCLUDE = "edgewebfonts.generateinclude";
    var PREFERENCES_CLIENT_ID = "com.adobe.edgewebfonts";
    var PREFERENCES_FONT_HISTORY_KEY = "ewf-font-history";
    
    // Local variables
    var lastFontSelected = null;
    var lastTwentyFonts = [];
    var prefs = {};
    var whitespaceRegExp = new RegExp("\\s");
    var scriptCache = {};
    
    function _documentIsCSS(doc) {
        return doc && EditorUtils.getModeFromFileExtension(doc.file.fullPath) === "css";
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
     *
     *  TODO: Write a unit test to check the code hint menu dom structure. This way, 
     *  if the code hint UI gets reorganized, the unit test will catch it. 
     */
    function _augmentCodeHintUI() {

        function repositionAddition($list, $addition) {
            var menuListPosition = $list.position();
            $addition.css("position", "absolute");
            $addition.css("top", menuListPosition.top + $list.height());
            $addition.css("left", menuListPosition.left);
            $addition.css("width", $list.width());
            $addition.css("max-width", $list.width());
        }

        var $menu = $(".dropdown.codehint-menu.open");

        if ($menu.length > 0) {
            var $menuList = $menu.find(".dropdown-menu");
            if ($menuList.length > 0) { // we're actually displaying a code hint
                // Since this dropdown menu has an addition, we need to add a class that
                // removes the rounded corners on the bottom
                $menuList.addClass("has-addition");
                
                var $codeHintAddition = $menu.find(".ewf-codehint-addition");
                
                // If this is a new popup, we won't have a code hint addition yet (new popup), 
                // so create it first
                if ($codeHintAddition.length === 0) {
                    // hack to prevent shifting as the background fonts load
                    $menuList.width($menuList.width() + 20);

                    $codeHintAddition = $(codeHintAdditionHtmlString);
                    repositionAddition($menuList, $codeHintAddition);
                    $menuList.after($codeHintAddition);
                    $codeHintAddition.find('a').on('click', function () {
                        CommandManager.execute(COMMAND_BROWSE_FONTS);
                        return false; // don't actually follow link
                    });
                } else {
                    // This method only gets called when the pop up has changed in some way
                    // (e.g. a new search). So, the popup has always moved. We need to reposition.
                    repositionAddition($menuList, $codeHintAddition);
                }
            }
        }
    }
    
    function _insertFontCompletionAtCursor(completion, editor, cursor) {
        var token;
        var actualCompletion = completion;
        var stringChar = "\"";
        
        if (_documentIsCSS(editor.document)) { // on the off-chance we changed documents, don't change anything
            token = parser.getFontTokenAtCursor(editor, cursor);
            if (token) {
                // get the correct string character if there is already one in use
                if (token.className === "string") {
                    stringChar = token.string.substring(0, 1);
                }

                // wrap the completion in string character if either 
                //  a.) we're inserting into a string, or 
                //  b.) the slug contains a space
                if (token.className === "string" || whitespaceRegExp.test(actualCompletion)) {
                    actualCompletion = stringChar + actualCompletion + stringChar;
                }

                // HACK: We talk to the private CodeMirror instance directly to replace the range
                // instead of using the Document, as we should. The reason is due to a flaw in our
                // current document synchronization architecture when inline editors are open.
                // See #1688.
                if (token.className === "string" || token.className === "number") { // replace
                    editor._codeMirror.replaceRange(actualCompletion,
                                                 {line: cursor.line, ch: token.start},
                                                 {line: cursor.line, ch: token.end});
                } else { // insert
                    editor._codeMirror.replaceRange(actualCompletion, cursor);
                }
            }
        }
        
        // record it in our font history
        var i = lastTwentyFonts.indexOf(completion);
        if (i >= 0) {
            lastTwentyFonts.splice(i, 1);
        }
        lastTwentyFonts.splice(0, 0, completion); // add completion to front of array
        if (lastTwentyFonts.length > 20) {
            lastTwentyFonts.splice(20, lastTwentyFonts.length - 20);
        }
        prefs.setValue(PREFERENCES_FONT_HISTORY_KEY, lastTwentyFonts);
    }
    
    function _showHowtoDialog() {
        Dialogs.showModalDialog("edge-web-fonts-howto-dialog");
    }
    
    /**
     * @constructor
     */
    function FontHints() {}

    /**
     * Determines whether font hints are available in the current editor
     * context.
     *
     * @param {Editor} editor
     * A non-null editor object for the active window.
     *
     * @param {String} implicitChar
     * Either null, if the hinting request was explicit, or a single character
     * that represents the last insertion and that indicates an implicit
     * hinting request.
     *
     * @return {Boolean}
     * Determines whether the current provider is able to provide hints for
     * the given editor context and, in case implicitChar is non- null,
     * whether it is appropriate to do so.
     */
    FontHints.prototype.hasHints = function (editor, implicitChar) {
        this.editor = editor;
        if (!implicitChar) {
            if (_documentIsCSS(editor.document)) {
                if (parser.getFontTokenAtCursor(editor, editor.getCursorPos())) {
                    return true;
                }
            }
        }
        return false;
    };

    /**
     * Returns a list of availble font hints, if possible, for the current
     * editor context.
     *
     * @return {Object<hints: Array<jQuery.Object>, match: String,
     *      selectInitial: Boolean>}
     * Null if the provider wishes to end the hinting session. Otherwise, a
     * response object that provides 1. a sorted array formatted hints; 2. a
     * null string match to indicate that the hints are already formatted;
     * and 3. a boolean that indicates whether the first result, if one exists,
     * should be selected by default in the hint list window.
     */
    FontHints.prototype.getHints = function (key) {
        var editor = this.editor,
            cursor = editor.getCursorPos(),
            query,
            token;
        
        if (_documentIsCSS(editor.document)) {
            token = parser.getFontTokenAtCursor(editor, cursor);
            if (token) {
                if (token.className === "string") { // is wrapped in quotes        
                    if (token.start < cursor.ch) { // actually in the text
                        query = token.string.substring(1, cursor.ch - token.start);
                        if (token.end === cursor.ch) { // at the end, so need to clip off closing quote
                            query = query.substring(0, query.length - 1);
                        }
                    } else { // not in the text
                        query = "";
                    }
                } else if (token.className === "number") { // is not wrapped in quotes
                    query = token.string.substring(0, cursor.ch - token.start);
                } else { // after a ":", a space, or a ","
                    query = "";
                }

                // we're going to handle this query, so we need to add our UI
                setTimeout(_augmentCodeHintUI, 1);

                var candidates = parser.parseCurrentEditor(true);
                candidates = candidates.concat(lastTwentyFonts);
                candidates = candidates.concat(webfont.getWebsafeFonts());
                candidates = webfont.lowerSortUniqStringArray(candidates);
                candidates = webfont.filterAndSortArray(query, candidates);
                candidates = candidates.map(function (hint) {
                    var index       = hint.indexOf(query),
                        $hintObj    = $('<span>'),
                        slugs       = webfont.searchBySlug(hint);

                    // load the matching font scripts individually for cachability
                    slugs.forEach(function (slug) {
                        var font = webfont.getFontBySlug(slug),
                            script;
                        if (!(scriptCache.hasOwnProperty(slug))) {
                            script = webfont.createInclude([font]);
                            $(script).appendTo("head");
                            scriptCache[slug] = true;
                        }
                    });

                    // emphasize the matching substring
                    if (index >= 0) {
                        $hintObj.append(hint.slice(0, index))
                            .append($('<span>')
                                    .append(hint.slice(index, index + query.length))
                                    .css('font-weight', 'bold'))
                            .append(hint.slice(index + query.length));
                    } else {
                        $hintObj.text(hint);
                    }

                    // set the font family and attach the hint string as data
                    $hintObj
                        .append($('<span>')
                                .append(Strings.SAMPLE_TEXT)
                                .css('padding-right', '10px') // hack to match left-side padding
                                .css('float', 'right')
                                .css('font-family', hint + ", AdobeBlank"))
                        .data('hint', hint);
                    return $hintObj;
                });

                return {
                    hints: candidates,
                    match: null,
                    selectInitial: true
                };
            }
        }
        return null;
    };

    /**
     * Inserts a given font hint into the current editor context.
     *
     * @param {jQuery.Object} completion
     * The hint to be inserted into the editor context.
     *
     * @return {Boolean}
     * Indicates whether the manager should follow hint insertion with an
     * additional explicit hint request.
     */
    FontHints.prototype.insertHint = function (completion) {
        var editor = this.editor,
            cursor = editor.getCursorPos();

        _insertFontCompletionAtCursor(completion.data('hint'), editor, cursor);
        return false;
    };
        
    function init() {
        function _handleBrowseFonts() {
            var editor = EditorManager.getFocusedEditor();
            var cursor = editor._codeMirror.getCursor();
            lastFontSelected = null;
            Dialogs.showModalDialog("edge-web-fonts-browse-dialog").done(function (id) {
                if (id === Dialogs.DIALOG_BTN_OK && lastFontSelected) {
                    _insertFontCompletionAtCursor(lastFontSelected, editor, cursor);
                }
                editor.focus();
            });
            webfont.renderPicker($('.instance .edge-web-fonts-browse-dialog-body')[0]);
        }
        
        /** Determines what font slugs are in the CSS file and generates the appropriate
         *  data to build the include string. Then, displays the string in a dialog
         *  The actual generation of the string is handled by a core API function
         *
         *  TODO: Right now, we just generate the maximal include string using all
         *  FVDs for a font and the "all" character subset. Long term, we should have a
         *  configurator UI that lets users specify which variants and subsets they want
         */
        function _handleGenerateInclude() {
            var fonts = parser.parseCurrentEditor(false);
            var fontFamilies = [], allFvds = [];
            var i, j, f;
            var includeString = "";
            
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
            
            if (fontFamilies.length === 0) { // no EWF in this css file
                _showHowtoDialog();
            } else {
                includeString = webfont.createInclude(fontFamilies);
                Dialogs.showModalDialog("edge-web-fonts-include-dialog");
                $('.instance .ewf-include-string').html(StringUtils.htmlEscape(includeString)).focus().select();
            }
        }

        function _handleToolbarClick() {
            var doc = DocumentManager.getCurrentDocument();

            if (!doc || !_documentIsCSS(doc)) {
                _showHowtoDialog();
            } else {
                CommandManager.execute(COMMAND_GENERATE_INCLUDE);
            }
        }
        
        function _handleDocumentChange() {
            var doc = DocumentManager.getCurrentDocument();
            // doc will be null if there's no active document (user closed all docs)
            if (doc && _documentIsCSS(doc)) {
                $toolbarIcon.addClass("active");
            } else {
                $toolbarIcon.removeClass("active");
            }
        }
        
        // install autocomplete handler
        var fontHints = new FontHints();
        CodeHintManager.registerHintProvider(fontHints, ["css"], 1);
        
        // load styles
        ExtensionUtils.loadStyleSheet(module, "styles/ewf-brackets.css");
        ExtensionUtils.loadStyleSheet(module, "styles/adobe-blank.css");
        
        // register commands
        CommandManager.register(Strings.CODEHINT_BROWSE, COMMAND_BROWSE_FONTS, _handleBrowseFonts);
        CommandManager.register(Strings.GENERATE_INCLUDE_TOOLTIP, COMMAND_GENERATE_INCLUDE, _handleGenerateInclude);
        
        // set up menu and keybinding
        /* NOTE: Decided not to have menu items for now. Leaving this code in case we want to add them back
        var menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);
        menu.addMenuItem(COMMAND_BROWSE_FONTS, "Ctrl-Alt-B", Menus.AFTER, Commands.EDIT_LINE_COMMENT);
        menu.addMenuItem(Menus.DIVIDER, null, Menus.BEFORE, COMMAND_BROWSE_FONTS);
        */

        // set up toolbar icon
        $toolbarIcon = $(Mustache.render(ewfToolbarHtml, Strings));
        $("#main-toolbar .buttons").append($toolbarIcon);
        $toolbarIcon.on("click", _handleToolbarClick);
        
        // add event handler to enable/disable the webfont toolbar icon
        $(DocumentManager).on("currentDocumentChange", _handleDocumentChange);
        _handleDocumentChange(); // set to appropriate state for curret doc
        
        // add dialogs to dom
        $('body').append($(Mustache.render(ewfBrowseDialogHtml, Strings)));
        $('body').append($(Mustache.render(ewfIncludeDialogHtml, Strings)));
        $('body').append($(Mustache.render(ewfHowtoDialogHtml, {Strings : Strings, Paths : Paths})));

        
        // add handler to listen to selection in browse dialog
        $(webfont).on("ewfFontSelected", function (event, slug) {
            lastFontSelected = slug;
        });
        
        // setup preferences
        prefs = PreferencesManager.getPreferenceStorage(PREFERENCES_CLIENT_ID);
        lastTwentyFonts = prefs.getValue(PREFERENCES_FONT_HISTORY_KEY);
        if (!lastTwentyFonts) {
            lastTwentyFonts = [];
        }

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
