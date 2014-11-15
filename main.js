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
/*global define, brackets, $, window, Mustache, less, setTimeout, clearTimeout */

define(function (require, exports, module) {
    "use strict";
    
    // Modules
    var webfont                 = require("webfont"),
        FontParser              = require("fontParser"),
        cssModeSupport          = require("cssModeSupport"),
        ewfBrowseDialogHtml     = require("text!htmlContent/ewf-browse-dialog.html"),
        ewfIncludeDialogHtml    = require("text!htmlContent/ewf-include-dialog.html"),
        ewfHowtoDialogHtml      = require("text!htmlContent/ewf-howto-dialog.html"),
        ewfToolbarHtml          = require("text!htmlContent/ewf-toolbar.html"),
        Strings                 = require("strings");

    var AppInit                 = brackets.getModule("utils/AppInit"),
        ExtensionUtils          = brackets.getModule("utils/ExtensionUtils"),
        DocumentManager         = brackets.getModule("document/DocumentManager"),
        EditorManager           = brackets.getModule("editor/EditorManager"),
        PreferencesManager      = brackets.getModule("preferences/PreferencesManager"),
        CodeHintManager         = brackets.getModule("editor/CodeHintManager"),
        CommandManager          = brackets.getModule("command/CommandManager"),
        Commands                = brackets.getModule("command/Commands"),
        Dialogs                 = brackets.getModule("widgets/Dialogs"),
        Menus                   = brackets.getModule("command/Menus"),
        _                       = brackets.getModule("thirdparty/lodash");
    
    // DOM elements and HTML
    var $toolbarIcon = null;
    
    var Paths = {
        ROOT : require.toUrl('./')
    };
    
    // Commands & Prefs Strings
    var COMMAND_BROWSE_FONTS = "edgewebfonts.browsefonts";
    var COMMAND_GENERATE_INCLUDE = "edgewebfonts.generateinclude";
    var PREFERENCES_CLIENT_ID = "com.adobe.edgewebfonts";
    var PREFERENCES_FONT_HISTORY_KEY = "ewf-font-history";

    // Font parser
    var cssParser   = new FontParser(cssModeSupport);
    
    // Local variables
    var lastFontSelected = null;
    var lastTwentyFonts = [];
    var prefs;
    var whitespaceRegExp = /\s/;
    var commaSemiRegExp = /([;,])/;
    var fontnameStartRegExp = /[\w"',]/;
    var showBrowseWebFontsRegExp = /^["\'\s,]$/;
    var scriptCache = {};
    var closeHintOnNextKey = false;
    
    // Rendered templates
    var ewfBrowseDialogTemplate  = Mustache.render(ewfBrowseDialogHtml, Strings);
    var ewfIncludeDialogTemplate = Mustache.render(ewfIncludeDialogHtml, Strings);
    var ewfHowtoDialogTemplate   = Mustache.render(ewfHowtoDialogHtml, {Strings : Strings, Paths : Paths});
    
    // work around a URL jQuery URL escaping issue
    var howtoDiagramURL      = Mustache.render("{{{Paths.ROOT}}}{{{Strings.HOWTO_DIAGRAM_IMAGE}}}", {Strings : Strings, Paths : Paths}),
        howtoDiagramHiDPIURL = Mustache.render("{{{Paths.ROOT}}}{{{Strings.HOWTO_DIAGRAM_IMAGE_HIDPI}}}", {Strings : Strings, Paths : Paths});
    
    
    function _supportedLanguage(language) {
        var name = language.getName();
            
        return (name === "CSS" || name === "LESS" || name === "SCSS");
    }
    
    function _supportedDocument(doc) {
        return doc && _supportedLanguage(doc.getLanguage());
    }

    function _supportedContext(editor) {
        return editor && _supportedLanguage(editor.getLanguageForSelection());
    }
    
    function _getParserForContext(editor) {
        var language    = editor.getLanguageForSelection(),
            name        = language.getName();
        
        switch (name) {
        case "CSS":
        case "LESS":
        case "SCSS":
            return cssParser;
        default:
            throw new Error("Unsupported language: " + name);
        }
    }
    
    function _getModeSupportForContext(editor) {
        var language    = editor.getLanguageForSelection(),
            name        = language.getName();
        
        switch (name) {
        case "CSS":
        case "LESS":
        case "SCSS":
            return cssModeSupport;
        default:
            throw new Error("Unsupported language: " + name);
        }
    }

   
    function _insertFontCompletionAtCursor(completion, editor, cursor) {
        var modeSupport, parser, token;
        var actualCompletion = completion;
        var stringChar = "\"";
        
        if (_supportedContext(editor)) { // on the off-chance we changed documents, don't change anything
            modeSupport = _getModeSupportForContext(editor);
            parser = _getParserForContext(editor);
            token = parser.getFontTokenAtCursor(editor, cursor);
            if (token) {
                // get the correct string character if there is already one in use
                if (modeSupport.isFontNameStringToken(token)) {
                    stringChar = token.string.substring(0, 1);
                }

                // wrap the completion in string character if either 
                //  a.) we're inserting into a string, or 
                //  b.) the slug contains a space
                if (modeSupport.isFontNameStringToken(token) || whitespaceRegExp.test(actualCompletion)) {
                    actualCompletion = stringChar + actualCompletion + stringChar;
                }

                // Check if we're modifying an existing string. If so, it's possible that we're
                // in a situation with only one quote (i.e. the parser thinks the rest of the
                // line is a string. So, we want to stop at the first occurrence of a comma or 
                // semi-colon.
                var endChar = token.end;
                
                // add white space if previous char is not a white space
                var line = editor.document.getLine(cursor.line);


                // if the drop down was opened and the space was pressed, charBeforeCursor will be the 
                // first char of the actual completion. In that case we do NOT add white space.   
                
                // remove  semicolon from the end of the token, we only want to look at the actual
                // letters of the word to test for a prefix
                var prefix = token.string.replace(/[;,"]$/, "");
                var tokenIsPrefix = ((modeSupport.isFontNameToken(token) || modeSupport.isFontNameStringToken(token)) &&
                                     (actualCompletion.indexOf(prefix) === 0 || completion.indexOf(prefix) === 0));
                
                var charBeforeCursor = tokenIsPrefix || prefix === token.string ? line.charAt(token.start - 1) : line.charAt(token.start);
                
                if (!whitespaceRegExp.test(charBeforeCursor) && !whitespaceRegExp.test(prefix)) {
                    actualCompletion = " " + actualCompletion;
                }
                
                var charAfterCursor = line.charAt(cursor.ch);

                if (charAfterCursor !== "," &&
                        (charAfterCursor !== ";") &&
                        !(prefix === token.string && !whitespaceRegExp.test(prefix))) {
                    actualCompletion = actualCompletion + ", ";
                }
                
                if (modeSupport.isFontNameStringToken(token)) {
                    // Find the *first* comma or semi
                    var match = commaSemiRegExp.exec(token.string);
                    if (match) {
                        endChar = token.start + match.index;
                    }
                    
                }
                
                // HACK (tracking adobe/brackets#1688): We talk to the private CodeMirror instance
                // directly to replace the range instead of using the Document, as we should. The
                // reason is due to a flaw in our current document synchronization architecture when
                // inline editors are open.
                if (modeSupport.isFontNameStringToken(token) ||
                        modeSupport.isFontNameToken(token)) { // replace
                    editor._codeMirror.replaceRange(actualCompletion,
                                                 {line: cursor.line, ch: token.start},
                                                 {line: cursor.line, ch: endChar});
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
        prefs.set(PREFERENCES_FONT_HISTORY_KEY, lastTwentyFonts);
        prefs.save();
    }
    
    function _showHowtoDialog() {
        var dlg = Dialogs.showModalDialogUsingTemplate(ewfHowtoDialogTemplate);

        $(".edge-web-fonts-howto-diagram").css("background-image", "-webkit-image-set(url('" + howtoDiagramURL + "') 1x, url('" + howtoDiagramHiDPIURL + "') 2x)");
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
        var parser;
        
        this.editor = editor;
        if (_supportedContext(editor)) {
            parser = _getParserForContext(editor);
            if (!implicitChar) {
                if (parser.getFontTokenAtCursor(editor, editor.getCursorPos())) {
                    return true;
                }
            } else if (fontnameStartRegExp.test(implicitChar)) {
                // We only display the hint list implicitly if the following conditions are both met:
                //   1. The implicit char is a word character or a quote (covered by the test above)
                //   2. We're in a font-family rule (covered by checking parser.getFontTokenAtCursor !== null)
                // We check them in this order because checking the implict char is much cheaper.
                var currentPosition = editor.getCursorPos();
                if (currentPosition.ch >= 1) {
                    var currentToken = parser.getFontTokenAtCursor(editor, editor.getCursorPos());
                    if (currentToken) {
                        return true;
                    }
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
            lowerCaseQuery,
            modeSupport,
            parser,
            token;
        
        if (_supportedContext(editor)) {
            modeSupport = _getModeSupportForContext(editor);
            parser = _getParserForContext(editor);
            token = parser.getFontTokenAtCursor(editor, cursor);
            if (token) {
                if (modeSupport.isFontNameStringToken(token)) { // is wrapped in quotes        
                    if (token.start < cursor.ch) { // actually in the text
                        query = token.string.substring(1, cursor.ch - token.start);
                        if (token.end === cursor.ch) { // at the end, so need to clip off closing quote
                            query = query.substring(0, query.length - 1);
                        }
                    } else { // not in the text
                        query = "";
                    }
                } else if (modeSupport.isFontNameToken(token)) { // is not wrapped in quotes
                    query = token.string.substring(0, cursor.ch - token.start);
                } else { // after a ":", a space, or a ","
                    query = "";
                }

                // candidate hints are lower case, so the query should be too
                lowerCaseQuery = query.toLocaleLowerCase();
                
                var candidates = parser.parseCurrentEditor(true);

                candidates = candidates.concat(lastTwentyFonts);
                candidates = candidates.concat(webfont.getWebsafeFonts());
                candidates = webfont.lowerSortUniqStringArray(candidates);
                candidates = webfont.filterAndSortArray(query, candidates);
                candidates = candidates.map(function (hint) {
                    var index       = hint.indexOf(lowerCaseQuery),
                        $hintObj    = $('<span>'),
                        slugs       = webfont.searchBySlug(hint);

                    // load the matching font scripts individually for cachability
                    slugs.forEach(function (slug) {
                        var font = webfont.getFontBySlug(slug),
                            script;
                        if (!(scriptCache.hasOwnProperty(slug)) && window.navigator.onLine) {
                            script = webfont.createInclude([font]);
                            $(script).appendTo("head");
                            scriptCache[slug] = true;
                        }
                    });
                    
                    var fontNameSpan = $('<span class="ewf-fontname">');

                    // emphasize the matching substring
                    if (index >= 0) {
                        fontNameSpan.append(hint.slice(0, index))
                            .append($('<span class="ewf-fontname-bold">')
                                    .append(hint.slice(index, index + query.length)))
                            .append(hint.slice(index + query.length));
                    } else {
                        fontNameSpan.text(hint);
                    }

                    var fontSampleSpan = $('<span>');
                    // set the font family and attach the hint string as data
                    fontSampleSpan
                        .append($('<span class="ewf-fontsample">')
                                .append(Strings.SAMPLE_TEXT)
                                .css('font-family', hint + ", AdobeBlank"));
                    
                    $hintObj.append(fontNameSpan, fontSampleSpan).data('hint', hint);
                    
                    return $hintObj;
                });
                var selectInitial = true;
                // attach Browse WF
                if (window.navigator.onLine) {
                    // Browse Web Fonts link
                    var $browseEwfObj = $('<span>')
                        .append($('<span class="ewf-codehint-addition">')
                                .html(Strings.CODEHINT_BROWSE))
                        .data('stub', true);
    
                    $browseEwfObj.find('.ewf-codehint-addition').on('click', function () {
                        CommandManager.execute(COMMAND_BROWSE_FONTS);
                        return false; // don't actually follow link
                    });
                    
                    if (!query || showBrowseWebFontsRegExp.test(query)) {
                        // show Browse WF first the user is not typing
                        candidates.unshift($browseEwfObj);
                    } else {
                        // show Browse WF last if the user is typing                   
                        candidates.push($browseEwfObj);
                    }
                    // close the code hint session if we had nothing to 
                    // suggest but Browse WF last time.
                    if (closeHintOnNextKey && candidates.length <= 1) {
                        return null;
                    }
                    closeHintOnNextKey = candidates.length <= 1;
                    
                    // always select the fist code hint, unless we suggedt Browse WF
                    selectInitial = candidates.length > 1;
                }
   
                return {
                    hints: candidates,
                    match: null,
                    selectInitial: selectInitial
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

        if (completion.data('stub')) {
            // open WF dialog if user selects Browse WF            
            CommandManager.execute(COMMAND_BROWSE_FONTS);
        } else {
            // insert font name if user selected a font name
            _insertFontCompletionAtCursor(completion.data('hint'), editor, cursor);
        }
        return false;
    };
        
    function init() {
        function _handleBrowseFonts() {
            var editor = EditorManager.getFocusedEditor();
            var cursor = editor._codeMirror.getCursor();
            lastFontSelected = null;

            function handleFontChosen() {
                if (lastFontSelected) {
                    _insertFontCompletionAtCursor(lastFontSelected, editor, cursor);
                }
                $(webfont).off("ewfFontChosen");
            }
            
            var dlg = Dialogs.showModalDialogUsingTemplate(ewfBrowseDialogTemplate);
            dlg.done(function (id) {
                if (id === Dialogs.DIALOG_BTN_OK) {
                    handleFontChosen();
                }
                editor.focus();
            });

            webfont.renderPicker($('.edge-web-fonts-browse-dialog.instance'));
            
            $(webfont).on("ewfFontChosen", function () {
                dlg.close();
                handleFontChosen();
                editor.focus();
            });
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
            var editor = EditorManager.getFocusedEditor() || EditorManager.getCurrentFullEditor();
            var parser = _getParserForContext(editor);
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
                var dlg = Dialogs.showModalDialogUsingTemplate(ewfIncludeDialogTemplate);
                $('.instance .ewf-include-string').html(_.escape(includeString)).focus().select();
            }
        }
        
        // install autocomplete handler
        var fontHints = new FontHints();
        CodeHintManager.registerHintProvider(fontHints, ["css", "less", "scss"], 1);
        
        // load blank font
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

        $(webfont).on("ewfFontSelected", function (event, slug) {
            lastFontSelected = slug;
        });
        
        // setup preferences
        prefs = PreferencesManager.getExtensionPrefs("edgewebfonts");
        lastTwentyFonts = prefs.get(PREFERENCES_FONT_HISTORY_KEY);
        if (!lastTwentyFonts) {
            lastTwentyFonts = [];
        }

    }

    // load everything when brackets is done loading
    AppInit.appReady(function () {
        
        function _handleToolbarClick() {
            var doc = DocumentManager.getCurrentDocument();

            if (!doc || !_supportedDocument(doc)) {
                _showHowtoDialog();
            } else {
                CommandManager.execute(COMMAND_GENERATE_INCLUDE);
            }
        }
        
        function _handleDocumentChange() {
            var doc = DocumentManager.getCurrentDocument();
            // doc will be null if there's no active document (user closed all docs)
            if (doc && _supportedDocument(doc)) {
                $toolbarIcon.addClass("active");
            } else {
                $toolbarIcon.removeClass("active");
            }
        }

        var handleOnline,
            handleOffline;
        
        /*
         * Handle the connection online event by re-enabling the toolbar icon
         * and the document change listeners.
         */
        handleOnline = function () {
            window.addEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
            
            $toolbarIcon.on("click", _handleToolbarClick);
            $toolbarIcon.attr("title", Strings.GENERATE_INCLUDE_TOOLTIP);
            $toolbarIcon.removeClass("disabled");
            
            // add event handler to enable/disable the webfont toolbar icon
            $(DocumentManager).on("currentDocumentChange", _handleDocumentChange);
            
            // set to appropriate state for current doc
            _handleDocumentChange();
        };

        /*
         * Handle the connection offline event by disabling the toolbar icon
         * and the document change listeners.
         */
        handleOffline = function (addListeners) {
            if (addListeners || addListeners === undefined) {
                window.addEventListener("online", handleOnline);
                window.removeEventListener("offline", handleOffline);
            }
                
            $toolbarIcon.off("click", _handleToolbarClick);
            $toolbarIcon.attr("title", Strings.WEBFONTS_OFFLINE);
            $toolbarIcon.removeClass("active");
            $toolbarIcon.addClass("disabled");
            
            $(DocumentManager).off("currentDocumentChange", _handleDocumentChange);
        };
        
        /*
         * Start the web fonts extension
         */
        function startExtension() {
            var MAX_DELAY       = 64000,
                delay           = 1000;
            
            window.removeEventListener("online", startExtension);
            
            (function startExtensionHelper() {
                webfont.init()
                    .done(function () {
                        init(); // register commands if the core loaded properly
                        if (window.navigator.onLine) {
                            handleOnline();
                        } else {
                            window.addEventListener("online", handleOnline);
                        }
                    }).fail(function (err) {
                        if (window.navigator.onLine) {
                            setTimeout(startExtensionHelper, delay);
                            if (delay < MAX_DELAY) {
                                delay *= 2;
                            }
                        } else {
                            window.addEventListener("online", startExtension);
                        }
                    });
            }());
        }
        
        // load styles
        ExtensionUtils.loadStyleSheet(module, "styles/ewf-brackets.css");

        // set up toolbar icon
        $toolbarIcon = $(Mustache.render(ewfToolbarHtml, Strings));
        $toolbarIcon.appendTo("#main-toolbar > .buttons");
        
        // begin as though we are offline, but don't add any online listeners
        handleOffline(false);
        
        // try to start the extension
        startExtension();
    });
});
