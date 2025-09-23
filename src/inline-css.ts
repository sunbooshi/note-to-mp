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

// 需要渲染进inline style的css样式
export default `
/* --------------------------------------- */
/* callout */
/* --------------------------------------- */
section .note-callout {
  border: none;
  padding: 1em 1em 1em 1.5em;
  display: flex;
  flex-direction: column;
  margin: 1em 0;
  border-radius: 4px;
}

section .note-callout-title-wrap {
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 1em;
  font-weight: 600;
}

.note-callout-icon {
  display: inline-block;
  width: 18px;
  height: 18px;  
}

.note-callout-icon svg {
  width: 100%;
  height: 100%;
}

section .note-callout-title {
  margin-left: 0.25em;
}

section .note-callout-content {
  color: rgb(34,34,34);
}

/* note info todo */
section .note-callout-note { 
  color: rgb(8, 109, 221);
  background-color: rgba(8, 109, 221, 0.1);
}
/* abstract tip hint */
section .note-callout-abstract {
  color: rgb(0, 191, 188);
  background-color: rgba(0, 191, 188, 0.1);
}
section .note-callout-success {
  color: rgb(8, 185, 78);
  background-color: rgba(8, 185, 78, 0.1);
}
/* question  help, faq, warning, caution, attention */
section .note-callout-question {
  color: rgb(236, 117, 0);
  background-color: rgba(236, 117, 0, 0.1);
}
/* failure, fail, missing, danger, error, bug */
section .note-callout-failure {
  color: rgb(233, 49, 71);
  background-color: rgba(233, 49, 71, 0.1);
}
section .note-callout-example {
  color: rgb(120, 82, 238);
  background-color: rgba(120, 82, 238, 0.1);
}
section .note-callout-quote {
  color: rgb(158, 158, 158);
  background-color: rgba(158, 158, 158, 0.1);
}
/* custom icon callout */
section .note-callout-custom { 
  color: rgb(8, 109, 221);
  background-color: rgba(8, 109, 221, 0.1);
}

/* --------------------------------------- */
/* math */
/* --------------------------------------- */
.block-math-svg {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  margin:20px 0px;
  max-width: 300% !important;
}

.block-math-svg svg {
  scale: 0.85;
}

.block-math-section {
  text-align: center;
  overflow: auto;
}

.inline-math-svg svg {
  font-size: 0.85em;
}

/* --------------------------------------- */
/* 高亮 */
/* --------------------------------------- */
.note-highlight {
  background-color: rgba(255,208,0, 0.4);
}

/* --------------------------------------- */
/* 列表需要强制设置样式*/
/* --------------------------------------- */
ul {
  list-style-type: disc;
}

.note-svg-icon {
  min-width: 24px;
  height: 24px;
  display: inline-block;
}

.note-svg-icon svg {
  width: 100%;
  height: 100%;
}

.note-embed-excalidraw-left {
  display: flex;
  flex-direction: row;
  width: 100%;
}

.note-embed-excalidraw-center {
  display: flex;
  flex-direction: row;
  justify-content: center;
  width: 100%;
}

.note-embed-excalidraw-right {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  width: 100%;
}

.note-embed-excalidraw {
  display: inline-block;
}

.note-embed-excalidraw p {
  line-height: 0 !important;
  margin: 0 !important;
}

/*
.note-embed-excalidraw svg {
  width: 100%;
  height: 100%;
}
*/

.note-embed-svg-left {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  width: 100%;
}

.note-embed-svg-center {
  display: flex;
  flex-direction: row;
  justify-content: center;
  width: 100%;
}

.note-embed-svg-right {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  width: 100%;
}

.note-embed-svg svg {
  width: 100%;
  height: 100%;
}

`;