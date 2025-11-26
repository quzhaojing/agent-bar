# 浏览器自动化技能系统

本文档介绍了为agent-bar项目新增的浏览器自动化技能系统。

## 🎯 概述

浏览器自动化技能系统为planner提供了丰富的浏览器操作能力，支持通过自然语言描述来自动识别和执行浏览器操作任务。

## 📁 文件结构

```
src/lib/agent/planner/
├── browser-skills.ts           # 浏览器技能定义和执行器
├── browser-skills-test.ts      # 测试文件
├── browser-skills-examples.ts  # 使用示例
├── analyzer.ts                 # 已更新：集成浏览器技能识别
└── executor.ts                 # 已更新：支持浏览器技能执行
```

## 🛠️ 可用的浏览器技能

### 1. 页面导航 (browser_navigate)
- **功能**: 导航到指定URL
- **参数**:
  - `url`: 目标URL
  - `waitForLoad`: 是否等待页面加载
  - `timeout`: 加载超时时间

### 2. 元素点击 (browser_click_element)
- **功能**: 点击页面元素
- **参数**:
  - `selector`: CSS选择器
  - `waitForElement`: 是否等待元素出现
  - `doubleClick`: 是否双击
  - `rightClick`: 是否右键点击

### 3. 文本输入 (browser_type_text)
- **功能**: 在输入框中输入文本
- **参数**:
  - `selector`: 输入框选择器
  - `text`: 输入内容
  - `clearFirst`: 输入前是否清空
  - `pressEnter`: 输入后是否按回车

### 4. 表单填写 (browser_fill_form)
- **功能**: 自动填写表单
- **参数**:
  - `formSelector`: 表单选择器
  - `formData`: 表单数据对象
  - `submitAfterFill`: 填写后是否自动提交

### 5. 页面滚动 (browser_scroll_page)
- **功能**: 滚动页面
- **参数**:
  - `direction`: 滚动方向 (up/down/left/right)
  - `distance`: 滚动距离
  - `selector`: 滚动到特定元素
  - `smooth`: 是否平滑滚动

### 6. 元素等待 (browser_wait_for_element)
- **功能**: 等待元素出现或消失
- **参数**:
  - `selector`: 元素选择器
  - `state`: 等待状态 (visible/hidden/present/absent)
  - `timeout`: 最大等待时间

### 7. 页面截图 (browser_take_screenshot)
- **功能**: 截取页面或元素截图
- **参数**:
  - `area`: 截图区域 (full/viewport/element)
  - `selector`: 元素选择器
  - `format`: 图片格式 (png/jpeg)
  - `quality`: 图片质量

### 8. 内容提取 (browser_extract_content)
- **功能**: 提取页面内容
- **参数**:
  - `contentType`: 提取内容类型 (text/links/images/tables/forms/all)
  - `selector`: 提取范围选择器
  - `structured`: 是否返回结构化数据

### 9. 下拉选择 (browser_select_dropdown)
- **功能**: 从下拉列表选择选项
- **参数**:
  - `selector`: 下拉框选择器
  - `value`: 选择的值
  - `selectBy`: 选择方式 (value/text/index)

### 10. 鼠标悬停 (browser_hover_element)
- **功能**: 鼠标悬停在元素上
- **参数**:
  - `selector`: 元素选择器
  - `duration`: 悬停持续时间
  - `offset`: 相对偏移量

### 11. 拖拽操作 (browser_drag_drop)
- **功能**: 拖拽元素到指定位置
- **参数**:
  - `source`: 源元素选择器
  - `target`: 目标元素选择器
  - `targetPosition`: 目标位置坐标
  - `duration`: 拖拽持续时间

### 12. 文件上传 (browser_upload_file)
- **功能**: 上传文件
- **参数**:
  - `selector`: 文件输入框选择器
  - `filePath`: 文件路径
  - `waitForUpload`: 是否等待上传完成

### 13. 页面刷新 (browser_refresh_page)
- **功能**: 刷新当前页面
- **参数**:
  - `force`: 是否强制刷新
  - `waitForLoad`: 是否等待加载完成

### 14. 标签页管理 (browser_tab_management)
- **功能**: 管理浏览器标签页
- **参数**:
  - `action`: 操作类型 (open/close/switch/new)
  - `target`: 目标标签页URL或索引
  - `url`: 新标签页URL

### 15. 智能等待 (browser_smart_wait)
- **功能**: 智能等待条件满足
- **参数**:
  - `condition`: 等待条件类型
  - `value`: 条件值
  - `timeout`: 最大等待时间
  - `interval`: 检查间隔

## 🚀 使用方法

### 1. 基本使用

```typescript
import { PromptAnalyzer } from './analyzer';
import { BrowserAutomationSkills } from './browser-skills';

const analyzer = new PromptAnalyzer();

const request = {
  prompt: '打开 https://example.com 并截取页面截图',
  availableTasks: BrowserAutomationSkills,
  constraints: {},
  preferences: {}
};

const plannedTasks = await analyzer.analyzePrompt(request);
```

### 2. 自然语言示例

用户可以使用自然语言描述复杂的浏览器操作：

```
请帮我:
1. 打开 https://github.com
2. 在搜索框中输入"web automation"
3. 点击搜索按钮
4. 等待结果加载
5. 点击第一个结果
6. 截取页面截图
```

系统会自动：
- 识别每个操作步骤
- 选择合适的浏览器技能
- 提取必要的参数
- 生成可执行的任务计划

### 3. 技能关键词

系统支持中英文关键词识别：

**中文关键词**:
- 导航/打开/访问 → browser_navigate
- 点击/选择/按一下 → browser_click_element
- 输入/填写/填入 → browser_type_text
- 滚动/向下滑/向上滑 → browser_scroll_page
- 截图/拍照/截屏 → browser_take_screenshot
- 提取/获取/抓取 → browser_extract_content
- 等待/暂停/延迟 → browser_wait_for_element

**英文关键词**:
- navigate/open/visit → browser_navigate
- click/select → browser_click_element
- type/input/enter → browser_type_text
- scroll → browser_scroll_page
- screenshot → browser_take_screenshot
- extract → browser_extract_content
- wait → browser_wait_for_element

## 🔧 集成架构

### 1. 技能定义层
- `AgentTask`: 技能的基础定义
- 参数验证和默认值
- 技能描述和关键词

### 2. 分析层 (PromptAnalyzer)
- 自然语言解析
- 技能匹配和参数提取
- 任务计划生成

### 3. 执行层 (TaskExecutor)
- 技能调度和执行
- 结果处理和返回
- 错误处理和重试

### 4. 工具层
- `BrowserTaskAnalyzer`: 页面分析
- `BrowserTaskExecutor`: 浏览器操作执行
- `BrowserSkillExecutor`: 技能执行器

## 📊 特性

### ✅ 已实现功能
- 15个完整的浏览器自动化技能
- 中英文自然语言识别
- 智能参数提取和验证
- 模块化架构设计
- 完整的TypeScript类型定义
- 错误处理和重试机制
- 并行和串行执行支持

### 🔄 扩展性
- 易于添加新的浏览器技能
- 支持自定义参数提取规则
- 可配置的执行策略
- 灵活的技能组合

### 🎯 智能化
- 上下文感知的参数提取
- 基于页面分析的智能选择器生成
- 自适应的执行时间估算
- 智能错误恢复

## 🧪 测试

运行测试套件：
```typescript
import { runBrowserSkillsTests } from './browser-skills-test';
await runBrowserSkillsTests();
```

查看使用示例：
```typescript
import { runAllExamples } from './browser-skills-examples';
await runAllExamples();
```

## 🔮 未来规划

1. **增强智能**: 基于机器学习的技能推荐
2. **可视化**: 任务执行过程的可视化监控
3. **录制回放**: 用户操作的录制和自动回放
4. **云端执行**: 支持云端浏览器执行环境
5. **插件系统**: 第三方技能插件支持

## 📝 注意事项

1. 当前实现为简化版本，实际浏览器操作需要完整的浏览器自动化框架支持
2. 部分高级功能（如hover、drag_drop）暂时转换为基本操作
3. 建议在生产环境使用前进行充分测试
4. 注意浏览器的跨域限制和安全策略

## 🤝 贡献

欢迎提交新的浏览器技能、改进建议或bug报告！