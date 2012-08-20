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
        Strings        = require("core/strings");
    
    
    var CommandManager = brackets.getModule("command/CommandManager"),
        Commands       = brackets.getModule("command/Commands"),
        Dialogs        = brackets.getModule("widgets/Dialogs"),
        Menus          = brackets.getModule("command/Menus");

    
    // Function to run when the menu item is clicked
    function handleBrowseFonts() {
        Dialogs.showModalDialog("edge-web-fonts-dialog");
        webfont.renderPicker($('.instance #edge-web-fonts-dialog-body')[0]);
    }
    
    // First, register a command - a UI-less object associating an id to a handler
    var COMMAND_BROWSE_FONTS = "edgewebfonts.browsefonts";   // package-style naming to avoid collisions
    CommandManager.register(Strings.MENU_BROWSE_FONTS, COMMAND_BROWSE_FONTS, handleBrowseFonts);

    // Then create a menu item bound to the command
    // The label of the menu item is the name we gave the command (see above)
    var menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);
    
    // We could also add a key binding at the same time:
    menu.addMenuItem(COMMAND_BROWSE_FONTS, "Ctrl-Alt-B", Menus.AFTER, Commands.EDIT_LINE_COMMENT);
    menu.addMenuItem(Menus.DIVIDER, null, Menus.BEFORE, COMMAND_BROWSE_FONTS);
                     
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
    
    brackets.ready(function () {
        
        webfont.init()
            .done(function () {
                var d = $(Mustache.render(ewfDialogHtml, Strings));
                $('body').append(d);
            })
            .fail(function (err) {
                console.log("[edge-web-font extension] failed to initialize: " + err);
            });
        
        _loadLessFile("ewf-brackets.less", _extensionDirForBrowser());

        
        
    });
});