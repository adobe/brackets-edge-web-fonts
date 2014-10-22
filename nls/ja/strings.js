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
/*global define */

define({
	"PRODUCT_NAME": "Edge Web Fonts",

	"DIALOG_DONE": "完了",
	"CANCEL": "キャンセル",
	"SEARCH_PLACEHOLDER": "検索",
	"BROWSE_FONTS_INSTRUCTIONS": "Web プロジェクトに追加する Web フォントを探して選択してください。",
	"CODEHINT_BROWSE": "Web Fonts を検索...",
	"GENERATE_INCLUDE_TOOLTIP": "Edge Web Fonts 埋め込みコードを作成",
	"WEBFONTS_OFFLINE": "Web Fonts サーバーにアクセスできないため、Edge Web Fonts 拡張機能が無効になりました。インターネット接続を確認し、後でもう一度お試しください。",
	"INCLUDE_INSTRUCTIONS": "サイトのフォントが確実に正しく読み込まれるように、この CSS ファイルを参照しているすべての HTML ファイルの <code>&lt;head&gt;</code> の部分に、このスクリプトタグを追加してください。",
	"HOWTO_INSTRUCTIONS_1": "Edge Web Fonts があれば、Adobe、Google および世界中のデザイナーの協力によって実現した web フォントの宝庫が使えるようになります。フォントは Typekit に搭載されており、無料で web サイトに使用できます。",
	"HOWTO_INSTRUCTIONS_2": "CSS ドキュメントでフォントファミリーのプロパティを指定するときに、コードの完成ドロップダウンで「Web Fonts を検索」を選択し、無料のオンライン Web フォントを検索します。",
	"HOWTO_INSTRUCTIONS_3": "終了したら、右上の <div class='instructions-icon'></div> アイコンをクリックして必要な埋め込みコードを作成します。",
	"HOWTO_INSTRUCTIONS_4": "埋め込みコードを HTML ページにペーストしてフォントを追加します。",
	"HOWTO_DIAGRAM_IMAGE": "img/ewf-howto-dialog-ja.png",
	"HOWTO_DIAGRAM_IMAGE_HIDPI": "img/ewf-howto-dialog-ja@2x.png",
	"TERMS_OF_USE": "<a href='http://adobe.com/go/edgewebfonts_tou_jp'>Edge Web Fonts 利用条件</a>",
	"SAMPLE_TEXT": "サンプル",
    
    // Font classifications
	"serif": "Serif",
	"sans-serif": "Sans-Serif",
	"slab-serif": "Slab-Serif",
	"script": "スクリプト",
	"blackletter": "ブラックレター",
	"monospaced": "等幅",
	"handmade": "手書き",
	"decorative": "装飾",
	"headings": "見出し",
	"paragraphs": "段落"
});
