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
    
    var webfont        = require("core/webfont"),
        ewfDialogHtml  = require("text!ewf-dialog.html"),
        ewfToolbarHtml = require("text!ewf-toolbar.html"),
        Strings        = require("core/strings");
    
    
    var AppInit         = brackets.getModule("utils/AppInit"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        EditorUtils     = brackets.getModule("editor/EditorUtils"),
        CommandManager  = brackets.getModule("command/CommandManager"),
        Commands        = brackets.getModule("command/Commands"),
        Dialogs         = brackets.getModule("widgets/Dialogs"),
        Menus           = brackets.getModule("command/Menus");

    var $toolbarIcon = null;
    
    // commands
    var COMMAND_BROWSE_FONTS = "edgewebfonts.browsefonts";
    
    function init() {
        /** Find this extension's directory relative to the brackets root */
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
            Dialogs.showModalDialog("edge-web-fonts-dialog");
            webfont.renderPicker($('.instance #edge-web-fonts-dialog-body')[0]);
        }
        
        function _handleDocumentChange() {
            var doc = DocumentManager.getCurrentDocument();
            var mode = null;
            if (doc) { // will be null if there's no document (user closed only open doc)
                mode = EditorUtils.getModeFromFileExtension(doc.file.fullPath);
            }
            console.log("[ewf] Document mode changed", mode);
            if (mode === "css") {
                $toolbarIcon.addClass('active');
            } else {
                $toolbarIcon.removeClass('active');
            }
        }
        
        
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
        
        // add browsing dialog to dom
        $('body').append($(Mustache.render(ewfDialogHtml, Strings)));
        
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