# 简介

这是一个Obsidian插件，针对微信公众号编缉器进行了优化，通过本插件复制笔记可以把笔记样式同步到公众号编缉器，轻轻松松搞定文章格式，一劳永逸，而且支持代码高亮、代码行数显示等。针对微信公众号不能放链接也专门处理了，直接展示链接地址。

# 安装

到[Release](https://github.com/sunbooshi/note-to-mp/releases)页面下载最新版本，将插件解压到Obsidian仓库的`.obsidian/plugins/`目录下。

打开Obsidian的**设置**界面，点击**第三方插件**，在**已安装插件**中刷新一下，然后启用本插件**Note To MP**。

# 使用
点击Obsidian左侧工具栏中的图标
![](./clipboard-paste.png)或者按`Ctrl+P`打开命令，搜索**复制到公众号**。

检查样式无误后，点击**复制**按钮，然后到公众号粘贴即可。

# 新增样式

在插件目录下的`styles.json`文件中新增一条样式配置，如下所示

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

在`styles.css`追加定义样式，所有样式都应该写在`styles.json`中`className`定义的选择器下，以上面新增的样式举例，CSS应按如下所示编写：

```CSS
.new-style strong {
  font-weight: 700
}
.new-style a {
  color: #428bca;
  text-decoration: none;
  background: 0 0
}
.new-style p {
  margin: 10px 0;
  line-height: 1.7
}
```
