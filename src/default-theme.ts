/*
 * Copyright (c) 2024-2025 Sun Booshi
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

const css = `
/* =========================================================== */
/* Obsidian的默认样式                                            */
/* =========================================================== */
.note-to-mp {
    padding: 0;
    user-select: text;
    -webkit-user-select: text;
    color: #222222;
    font-size: 16px;
}

.note-to-mp:last-child {
    margin-bottom: 0;
}

.note-to-mp .fancybox-img {
    border: none;
}

.note-to-mp .fancybox-img:hover {
    opacity: none;
    border: none;
}

/*
=================================
Heading 
==================================
*/
.note-to-mp h1 {
    color: #222;
    font-weight: 700;
    font-size: 1.802em;
    line-height: 1.2;
    margin-block-start: 1em;
    margin-block-end: 0;
}

.note-to-mp h2 {
    color: #222;
    font-weight: 600;
    font-size: 1.602em;
    line-height: 1.2;
    margin-block-start: 1em;
    margin-block-end: 0;
}

.note-to-mp h3 {
    color: #222;
    font-weight: 600;
    font-size: 1.424em;
    line-height: 1.3;
    margin-block-start: 1em;
    margin-block-end: 0;
}

.note-to-mp h4 {
    color: #222;
    font-weight: 600;
    font-size: 1.266em;
    line-height: 1.4;
    margin-block-start: 1em;
    margin-block-end: 0;
}

.note-to-mp h5 {
    color: #222;
    margin-block-start: 1em;
    margin-block-end: 0;
}

.note-to-mp h6 {
    color: #222;
    margin-block-start: 1em;
    margin-block-end: 0;
}

/*
=================================
Horizontal Rules
==================================
    */
.note-to-mp hr {
    border-color: #e0e0e0;
    margin-top: 3em;
    margin-bottom: 3em;
}

/*
=================================
Paragraphs
==================================
    */
.note-to-mp p {
    line-height: 1.6em;
    margin: 1em 0;
}

/*
=================================
Emphasis
==================================
    */
.note-to-mp strong {
    color: #222222;
    font-weight: 600;
}

.note-to-mp em {
    color: inherit;
    font-style: italic;
}

.note-to-mp s {
    color: inherit;
}

/*
=================================
    Blockquotes
==================================
    */
.note-to-mp blockquote {
    font-size: 1rem;
    display: block;
    margin: 2em 0;
    padding: 0em 0.8em 0em 0.8em;
    position: relative;
    color: inherit;
    border-left: 0.15rem solid #7852ee;
}

.note-to-mp blockquote blockquote {
    margin: 0 0;
}

.note-to-mp blockquote p {
    margin: 0;
}

.note-to-mp blockquote footer strong {
    margin-right: 0.5em;
}

/*
=================================
List
==================================
*/
.note-to-mp ul {
    margin: 0;
    margin-top: 1.25em;
    margin-bottom: 1.25em;
    line-height: 1.6em;
}

.note-to-mp ul>li::marker {
    color: #ababab;
    /* font-size: 1.5em; */
}

.note-to-mp li>p {
    margin: 0;
}

.note-to-mp ol {
    margin: 0;
    padding: 0;
    margin-top: 1.25em;
    margin-bottom: 0em;
    list-style-type: decimal;
    line-height: 1.6em;
}

.note-to-mp ol>li {
    position: relative;
    padding-left: 0.1em;
    margin-left: 2em;
}

/*
=================================
Link
==================================
*/
.note-to-mp a {
    color: #7852ee;
    text-decoration: none;
    font-weight: 500;
    text-decoration: none;
    border-bottom: 1px solid #7852ee;
    transition: border 0.3s ease-in-out;
}

.note-to-mp a:hover {
    color: #7952eebb;
    border-bottom: 1px solid #7952eebb;
}

/*
=================================
Table
==================================
*/
.note-to-mp table {
    width: 100%;
    table-layout: auto;
    text-align: left;
    margin-top: 2em;
    margin-bottom: 2em;
    font-size: 0.875em;
    line-height: 1.7142857;
    border-collapse: collapse;
    border-color: inherit;
    text-indent: 0;
}

.note-to-mp table thead {
    color: #000;
    font-weight: 600;
    border: #e0e0e0 1px solid;
}

.note-to-mp table thead th {
    vertical-align: bottom;
    padding-right: 0.5714286em;
    padding-bottom: 0.5714286em;
    padding-left: 0.5714286em;
    border: #e0e0e0 1px solid;
}

.note-to-mp table thead th:first-child {
    padding-left: 0.5em;
}

.note-to-mp table thead th:last-child {
    padding-right: 0.5em;
}

.note-to-mp table tbody tr {
    border-style: solid;
    border: #e0e0e0 1px solid;
}

.note-to-mp table tbody tr:last-child {
    border-bottom-width: 0;
}

.note-to-mp table tbody td {
    vertical-align: top;
    padding-top: 0.5714286em;
    padding-right: 0.5714286em;
    padding-bottom: 0.5714286em;
    padding-left: 0.5714286em;
    border: #e0e0e0 1px solid;
}

.note-to-mp table tbody td:first-child {
    padding-left: 0;
}

.note-to-mp table tbody td:last-child {
    padding-right: 0;
}

/*
=================================
Images
==================================
*/
.note-to-mp img {
    margin: 2em auto;
}

.note-to-mp .footnotes hr {
    margin-top: 4em;
    margin-bottom: 0.5em;
}

/*
=================================
Code
==================================
*/
.note-to-mp .code-section {
    display: flex;
    border: rgb(240, 240, 240) 1px solid;
    line-height: 26px;
    font-size: 14px;
    margin: 1em 0;
    padding: 0.875em;
    box-sizing: border-box;
}

.note-to-mp .code-section ul {
    width: fit-content;
    margin-block-start: 0;
    margin-block-end: 0;
    flex-shrink: 0;
    height: 100%;
    padding: 0;
    line-height: 26px;
    list-style-type: none;
    backgroud: transparent !important;
}

.note-to-mp .code-section ul>li {
    text-align: right;
}

.note-to-mp .code-section pre {
    margin-block-start: 0;
    margin-block-end: 0;
    white-space: normal;
    overflow: auto;
    padding: 0 0 0 0.875em;
}

.note-to-mp .code-section code {
    display: flex;
    text-wrap: nowrap;
    font-family: Consolas,Courier,monospace;
}
`

export default {name: '默认', className: 'obsidian-light', desc: '默认主题', author: 'SunBooshi', css:css};