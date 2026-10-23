/*
 * NoteToMP 发布后处理脚本（QuickAdd User Script）
 * ---------------------------------------------------------------------------
 * 微信公众号发布成功后，NoteToMP 会调用指定的 QuickAdd Choice，并传入：
 *   notePath     本次发布笔记在仓库中的完整相对路径
 *   publishedAt  发布成功时间（ISO 8601）
 *   status       发布结果，成功时为 success
 *   platform     发布平台，固定为 wechat
 *   accountName  发布目标公众号名称
 *
 * 本脚本把这些信息写入笔记属性（frontmatter）：
 *   发布日期  YYYY-MM-DD HH:mm（本地时间）
 *   发布状态  已发布 / 未发布
 *   发布账号  公众号名称
 *
 * 安装：
 *   1. 保存到仓库内任意非隐藏目录，例如 _quickadd/scripts/note-to-mp-post-publish.js
 *      （不能放在 .obsidian 或 . 开头的目录里，QuickAdd 会忽略）
 *   2. QuickAdd 设置 → Macro → 新建一个宏（例如「NoteToMP 发布后处理」），
 *      在宏里添加一个 User Script 步骤，选择本脚本
 *   3. NoteToMP 设置 → 发布后处理，填写上面这个宏的名称
 *
 *   注意：NoteToMP 调用的是 executeChoice(choiceName, variables)，参数必须是一个
 *   Choice 名称，所以需要用「宏 + User Script 步骤」包一层。
 */

module.exports = async (params) => {
  const { app, obsidian } = params;
  const Notice = obsidian && obsidian.Notice;

  // QuickAdd 会把 executeChoice 传入的变量放在 params.variables 里
  const vars = params.variables || params;
  const notePath = vars.notePath;
  const file = notePath ? app.vault.getAbstractFileByPath(notePath) : null;

  if (!file) {
    const message = notePath ? `未找到笔记：${notePath}` : "缺少 notePath 参数";
    console.warn(`[NoteToMP 后处理] ${message}`);
    if (Notice) new Notice(`发布后处理失败：${message}`);
    return;
  }

  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    frontmatter["发布日期"] = formatTime(vars.publishedAt);
    // NoteToMP 只在发布成功时触发，status 不是 success 时记为未发布
    frontmatter["发布状态"] = !vars.status || vars.status === "success" ? "已发布" : "未发布";
    if (vars.accountName) {
      frontmatter["发布账号"] = vars.accountName;
    }
  });

  console.log(`[NoteToMP 后处理] 已更新《${file.basename}》的发布属性`);
};

/** 把 ISO 时间格式化为本地时间 YYYY-MM-DD HH:mm，解析失败时退回当前时间 */
function formatTime(input) {
  const parsed = input ? new Date(input) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const pad = (value) => String(value).padStart(2, "0");
  const ymd = [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("-");
  return `${ymd} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
