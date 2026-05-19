# 刷题小站

一个轻量、中文界面的题库练习/考试站点，支持单选、多选、判断题，内置练习与考试模式、单题/整卷视图、IndexedDB 进度保存。

## 开发与运行

```bash
pnpm install
pnpm dev
```

构建与预览：

```bash
pnpm build
pnpm preview
```

## 导入格式（JSON）

最简结构如下：

```json
{
    "meta": {
        "title": "示例题库",
        "subject": "高等数学"
    },
    "questions": [
        {
            "id": "q-1",
            "type": "single",
            "stem": "题干...",
            "options": ["选项A", "选项B", "选项C", "选项D"],
            "answer": "A",
            "analysis": "解析...",
            "difficulty": 2
        },
        {
            "id": "q-2",
            "type": "multiple",
            "stem": "题干...",
            "options": ["选项A", "选项B", "选项C"],
            "answer": ["A", "C"]
        },
        {
            "id": "q-3",
            "type": "judge",
            "stem": "题干...",
            "answer": true
        }
    ]
}
```

说明：

- `type` 支持 `single` / `multiple` / `judge`。
- `options` 可为字符串数组，也可为对象数组（含 `id` 与 `text`）。
- 判断题 `answer` 支持 `true/false` 或 “正确/错误”。
- 当题目数超过 5000，会提示性能提醒。

## 使用说明

- 导入：进入“导入”页面上传 JSON 题库。
- 练习模式：作答后立即显示答案与解析；单选/判断在单题视图下自动跳题。
- 考试模式：隐藏答案与解析，交卷后显示成绩与错题；含计时但无时间限制。
- 视图切换：支持单题视图与整卷视图自由切换。
- 进度保存：仅保存每个题库最近一次练习/考试进度（IndexedDB）。

## 版本约定

- v1 仅支持单题库导入，预留多题库合并扩展点。
