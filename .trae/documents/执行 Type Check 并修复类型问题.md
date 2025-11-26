## 目标
- 在当前仓库运行 TypeScript 类型检查，收集并解析诊断。
- 若出现错误，提出并（经你确认后）应用精确修复，确保通过 `tsc --noEmit`。

## 执行步骤
1. 运行类型检查
   - 首选：`pnpm type-check`
   - 备用：`npm run type-check`
2. 收集并整理诊断输出（文件路径、行号、错误代码）。
3. 针对错误逐一给出修复补丁建议，并在你确认后应用：
   - 修改仅限必要位置，保持代码风格与既有约定（严格 TS、模块化、无多余注释）。
4. 复查：再次运行类型检查，确认全部通过。

## 可能的类型问题（预判）
- `chrome.tabs.captureVisibleTab`：API为回调式；当前实现中使用 `await` 赋值到 `dataUrl`，可能导致类型不匹配。修复方案：使用 `new Promise<string>((resolve, reject) => chrome.tabs.captureVisibleTab(undefined, opts, data => resolve(data)))` 包装。
- 其他 `chrome.*` API：若个别仍是回调式，将按需做轻量 Promise 包装，不更改行为。
- `LangGraph` 任务签名：已按 Functional API 使用；如出现工具调用类型不匹配，会以 `any` 收敛或补充最小类型定义确保通过。

## 输出与验收
- 提供完整的类型检查输出摘要（错误/警告数量、关键文件列表）。
- 对每条错误给出对应修复与原因说明以及变更位置。
- 最终以 `type-check` 通过为验收（零错误）。

## 后续扩展（可选）
- 增加最小的 `Promise` 包装工具函数，复用于所有回调式 Chrome API。
- 在不影响现有逻辑的前提下，为 Agent 步骤类型与工具返回值补充更精确的类型（保持现有结构化输出）。