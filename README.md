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
    "metadata": {
        "course": {
            "code": "MATH101",
            "name": "高等数学",
            "link": "https://example.com/course/math101"
        },
        "author": "张三",
        "source": "期中题库",
        "publishedAt": "2026-05-20T08:00:00Z"
    },
    "questions": [
        {
            "id": "q-1",
            "type": "single",
            "stem": "题干...",
            "options": ["选项1", "选项2", "选项3", "选项4"],
            "answer": 0,
            "analysis": "解析...",
            "difficulty": "中等"
        },
        {
            "id": "q-2",
            "type": "multiple",
            "stem": "题干...",
            "options":["选项1", "选项2", "选项3", "选项4"],
            "answer": [0, 2]
        },
        {
            "id": "q-3",
            "type": "judge",
            "stem": "题干...",
            "answer": true
        },
        {
            "id": "q-4",
            "type": "indeterminate",
            "stem": "题干...",
            "options":["选项1", "选项2", "选项3", "选项4"],
            "answer": [0, 1]
        }
    ]
}
```

说明：

- `type` 支持 `single` / `multiple` / `judge` / `indeterminate`。
- `metadata.course.code` 与 `metadata.course.name` 必填，`metadata.author` 必填。
- `options` 使用数组（单选/多选/不定项必填）。
- `answer` 使用选项索引（从 0 开始），多选/不定项为数组。
- 判断题 `answer` 使用 `true/false`。
- 选项不超过 26 个时显示 A-Z，超过则显示数字。
- 当题目数超过 5000，会提示性能提醒。

## 使用说明

- 导入：进入“导入”页面上传 JSON 题库。
- 练习模式：作答后立即显示答案与解析；单选/判断在单题视图下自动跳题。
- 考试模式：隐藏答案与解析，交卷后显示成绩与错题；含计时但无时间限制。
- 视图切换：支持单题视图与整卷视图自由切换。
- 进度保存：仅保存每个题库最近一次练习/考试进度（IndexedDB）。

## 版本约定

- v1 仅支持单题库导入，预留多题库合并扩展点。
