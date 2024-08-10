# 简介

这是一个Obsidian插件，针对微信公众号编缉器进行了优化，通过本插件复制笔记可以把笔记样式同步到公众号编缉器，轻轻松松搞定文章格式，一劳永逸，而且支持代码高亮、代码行数显示、主题背景颜色等。针对微信公众号不能放链接也专门处理了，提供直接展示链接地址和文末脚注展示两种方式。本项目初衷仅是为了能够将Obsidian中笔记的样式完美同步到微信公众号的编辑器中，因此项目重点在于保证文章格式的一致性，而不是成为一个微信公众号编辑器。

![](images/screenshot.png)

# 安装

## 1、使用BRAT插件安装
对于新手用户，推荐使用[BRAT插件](https://github.com/TfTHacker/obsidian42-brat)安装。

在BRAT的设置中
打开Obsidian的**设置**界面，在底部的**第三方插件**——在**BRAT**中点击**Add Beta plugin**，然后输入本插件地址`https://github.com/sunbooshi/note-to-mp`，点击**Add Plugin**就可以安装本插件了。


## 2、手动安装

到[Release](https://github.com/sunbooshi/note-to-mp/releases)页面下载最新版本，将`main.js`、 `manifest.json`、`styles.css`保存到Obsidian仓库的`.obsidian/plugins/note-to-mp`目录下。

打开Obsidian的**设置**界面，点击**第三方插件**，在**已安装插件**中刷新一下，然后启用本插件**Note To MP**。

## 3、主题、代码高亮下载

### 3.1 通过设置下载
为了尽可能保证插件符合官方规范，从`1.0.4`版本开始，主题和代码高亮需要在插件的设置——**获取更多主题**手动下载。

### 3.2 手动下载
也可以直接在[Release](https://github.com/sunbooshi/note-to-mp/releases)页面下载`assets.zip`文件，解压后放到`.obsidian/plugins/note-to-mp/assets`目录下。

完整的目录结构如下：

```
.obsidian/plugins/note-to-mp/
├── assets
│   ├── themes.json
│   ├── highlights.json
│   ├── themes
│   │   ├── maple.css
│   │   ├── mweb-ayu.css
│   │   └── ...
│   └── highlights
│       ├── a11y-dark.css
│       ├── a11y-light.css
│       └── ...
├── main.js
├── manifest.json
└── styles.css
  
```

# 使用
点击Obsidian左侧工具栏中的图标
![](images/clipboard-paste.png)或者按`Ctrl+P`打开命令，搜索**复制到公众号**。

检查样式无误后，点击**复制**按钮，然后到公众号粘贴即可。

## 插件配置

### 行号显示

默认情况下，代码块显示行号，如果需要关闭显示行号，可以到**设置**界面，**第三方插件**，**Note to MP**，然后勾选**显示代码行号**。

### 链接样式

由于微信公众号的限制，文章中的链接是无法点击的，为了让读者能够正常访问链接，插件默认将链接地址展示了出来，用户可以复制链接访问。如果希望将链接展示改为在文末统一展示，可以到**设置**界面，**第三方插件**，**Note to MP**，**链接展示样式**改为**脚注**。

### 获取更多主题
下载更多主要和代码高亮。

### 清空主题
清空已下载的主题及代码高亮。

# 主题

通过移植[imageslr/mweb-themes](https://github.com/imageslr/mweb-themes)，总共支持30多款主题，总有一款适合你。

## 自定义主题

在插件目录下的`themes.json`文件中新增一条样式配置，如下所示

```JSON
[
    {  
        已有样式定义 ...
    },
    
    {
        "name": "NewStyle", 
        "className": "new-style",
        "desc": "关于样式的描述",
        "author": "sunbooshi"
    }
]

```
其中各字段含义如下：

- name 是样式的名称，在预览页面用于展示。
- className 是CSS类名，不能包含空格。
- desc 样式的介绍
- author 样式作者


在themes目录下新增样式文件，文件名必须与className一致，例如上面新增的样式，则应该在`themes`目录下新增`new-style.css`文件。

在`new-style.css`追加定义样式，所有样式都应该写在`themes.json`中`className`定义的选择器下，以上面新增的样式举例，CSS应按如下所示编写：

```CSS
.note-to-mp strong {
  font-weight: 700
}
.note-to-mp a {
  color: #428bca;
  text-decoration: none;
  background: 0 0
}
.note-to-mp p {
  margin: 10px 0;
  line-height: 1.7
}
```
