# Old Preview Removal Record

## 仓库名称
`jinlinfeng2008/world-earth-homepage-preview`

## 仓库URL
https://github.com/jinlinfeng2008/world-earth-homepage-preview

## 默认分支
`main`

## 清理前最后commit SHA
`d508cfad6f1527574a69dec9e8fa8a279e4325d8`
（commit message: "fix(preview): restore default to the exact Codex fixture baseline"）

## GitHub Pages地址
https://jinlinfeng2008.github.io/world-earth-homepage-preview/
（`build_type: workflow`，`source.branch: main`，`public: true`，无自定义域名 / 无 CNAME 文件）

## 旧版本文件数量
114个受版本控制的文件（`git ls-tree -r main` 全量计数）

## 旧版本照片数量
- `world-earth-homepage-v1/fixtures/media/`：6张系统测试Fixture SVG（`asia-1/2`、`europe-1/2`、`north-america-1/2`），非真实照片，`authorization:"fixture"`。
- `demo-assets/media/`：36张合成占位SVG（非写实、无人像），供 `?demo=159` 可选参数使用的159条记录循环引用。
- 不包含任何真实Founder照片、`_private/`内容或`founder-validation-dataset.json`数据文件（仅存在`founder-validation-provider.js`代码文件，不含照片数据）。

## 旧版本性质
公开预览版：默认（无参数）展示6张系统测试Fixture，`?demo=159`可选展示159条合成占位数据；不是本次待上传的完整159张正式照片工程。

## 清理时间
2026-08-14（UTC时间以实际Git操作时间戳为准）

## 清理原因
Founder下达《World Earth旧预览清理、完整包审计与Git重新上传》执行指令：旧6-Fixture公开预览版本需要先归档并停止对外展示，避免与即将审计上传的159张完整正式工程同时存在、造成新旧版本混淆。

## 执行者
Claude（World Earth Technical Architect Seat），按Founder指令Phase 1只读审计+归档流程执行。

## 是否保留Git历史
是。默认分支`main`的完整commit历史不会被删除；本次清理仅清空默认分支的旧预览工程内容，仓库身份、Actions历史、Pages配置入口、Issues均保留。清理前状态已通过tag `archive/public-preview-6-fixtures-v1` 永久锚定，可随时回溯查看或回滚参考。
