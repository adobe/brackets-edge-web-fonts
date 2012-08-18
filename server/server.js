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
/*global require */

(function () {
    'use strict';

    var https = require('https');
    var connect = require('connect');

    var host = 'localhost';
    var port = 3000;
    
    var api_host = 'api.typekit.com';
    var api_path_prefix = '/muse_v1/';
    
    // because JSLint thinks "static" is a reserved word, but connect disagrees.
    connect.theStatic = connect['static'];
    
    var app = connect()
        .use(connect.logger('dev'))
        .use(connect.theStatic('../../../../'))
        .use(function (req, res) {
            if (req.url.indexOf('/proxy/') === 0) {
                var path = api_path_prefix + req.url.substr('/proxy/'.length);
                https.get(
                    {host: api_host, path: path},
                    function (clientResponse) {
                        clientResponse.pipe(res);
                    }
                );
            }
        })
        .listen(port, host);
    console.log("listening on " + host + " port " + port);
}());
