# Tasks

- [x] Task 1: 评估并固化 PRD 技术路线
  - [x] SubTask 1.1: 明确 MVP 首轮只覆盖 P0 功能闭环，P1 路线规划作为可扩展预留
  - [x] SubTask 1.2: 解决 PRD 中 localStorage 与 MySQL 主存储的冲突，确定 MySQL 为权威数据源
  - [x] SubTask 1.3: 标记高德 Key 已暴露风险，要求实现前轮换并改用环境变量

- [x] Task 2: 搭建前后端基础工程
  - [x] SubTask 2.1: 创建 React 18 + TypeScript + Vite 前端工程
  - [x] SubTask 2.2: 配置 Tailwind CSS 或等价样式方案，落地 PRD 中主色、文本色、面板色和布局基础
  - [x] SubTask 2.3: 创建 Go 1.22+ + Gin 后端工程
  - [x] SubTask 2.4: 配置 GORM、MySQL 连接、环境变量读取和统一错误响应
  - [x] SubTask 2.5: 确保前端、后端、数据库连接可独立启动并具备健康检查

- [x] Task 3: 建立数据模型与迁移
  - [x] SubTask 3.1: 实现 places、route_plans、route_plan_places 数据模型
  - [x] SubTask 3.2: 建立数据库迁移或 AutoMigrate 初始化流程
  - [x] SubTask 3.3: 为地点名称、经纬度、行政区划、标签、备注和时间字段添加必要校验
  - [x] SubTask 3.4: 为 adcode、街道分组、创建时间和路线排序建立索引或查询优化基础

- [x] Task 4: 实现后端地点与地图代理 API
  - [x] SubTask 4.1: 实现地点列表、创建、更新、删除接口
  - [x] SubTask 4.2: 实现完全同名和 100 米内近距离重复检测逻辑
  - [x] SubTask 4.3: 实现高德逆地理编码代理，返回规范化行政区划字段
  - [x] SubTask 4.4: 实现行政区划边界查询代理的接口边界与缓存策略
  - [x] SubTask 4.5: 实现结构化错误、超时、重试和降级响应

- [x] Task 5: 实现前端地图底图与 SDK 加载
  - [x] SubTask 5.1: 通过 @amap/amap-jsapi-loader 或项目已采用方案加载高德 JS API 2.0
  - [x] SubTask 5.2: 渲染地图主画布，支持缩放、拖拽、双击放大和触控交互
  - [x] SubTask 5.3: 实现地图加载中、加载失败和空状态提示
  - [x] SubTask 5.4: 实现地图与地点状态的生命周期清理，避免重复创建地图实例和覆盖物泄漏

- [x] Task 6: 实现地点搜索与添加流程
  - [x] SubTask 6.1: 实现顶部搜索框、输入防抖和至少 2 字符触发搜索
  - [x] SubTask 6.2: 展示最多 8 条联想结果，包含名称、完整地址和类型信息
  - [x] SubTask 6.3: 用户选择结果后补全经纬度与行政区划信息并调用后端创建地点
  - [x] SubTask 6.4: 处理无结果、重复地点、近距离地点确认和 API 失败提示
  - [x] SubTask 6.5: 添加成功后清空搜索框、地图平移到地点、刷新列表与聚合气泡

- [x] Task 7: 实现地图标记、聚合气泡与缩放联动
  - [x] SubTask 7.1: 根据后端地点列表渲染单点标记
  - [x] SubTask 7.2: 按省市区街道计算前端分组和几何中心
  - [x] SubTask 7.3: 在街道内地点数大于等于 2 时渲染聚合气泡
  - [x] SubTask 7.4: 按数量区间应用小、中、大气泡尺寸与蓝、橙、红视觉规则
  - [x] SubTask 7.5: 根据 zoom 小于 10、10 到 14、大于 14 切换区级聚合、街道级聚合和单点标记
  - [x] SubTask 7.6: 点击气泡时缩放到街道范围并展开侧边分组

- [x] Task 8: 实现标记详情与管理
  - [x] SubTask 8.1: 点击地图标记或列表地点时展示详情弹窗
  - [x] SubTask 8.2: 支持编辑备注，限制最多 200 字并保存到后端
  - [x] SubTask 8.3: 支持预设标签多选并保存到后端
  - [x] SubTask 8.4: 支持内联删除确认，删除后刷新地图标记、聚合气泡和分组

- [x] Task 9: 实现侧边面板全部与分组视图
  - [x] SubTask 9.1: 实现可折叠侧边面板和全部、分组两个 Tab
  - [x] SubTask 9.2: 全部视图按添加时间倒序展示地点并支持搜索筛选
  - [x] SubTask 9.3: 分组视图按城市、区、街道层级展示地点数量和列表
  - [x] SubTask 9.4: 点击列表地点联动地图居中并打开详情
  - [x] SubTask 9.5: 当分组地点数大于等于 2 时展示生成路线入口，首轮可显示预留状态

- [x] Task 10: 实现前端缓存与离线降级
  - [x] SubTask 10.1: 将最近一次地点列表缓存到 localStorage
  - [x] SubTask 10.2: 保存侧边面板折叠状态、当前 Tab 等非敏感 UI 状态
  - [x] SubTask 10.3: 后端不可用时展示缓存数据并提示服务暂时不可用

- [x] Task 11: 预留路线规划数据与接口边界
  - [x] SubTask 11.1: 后端保留路线计划和路线地点关联模型
  - [x] SubTask 11.2: 定义路线状态 planned、in_progress、completed
  - [x] SubTask 11.3: 定义路线距离和时间字段，供后续高德路线规划代理写入
  - [x] SubTask 11.4: 前端类型中保留 RoutePlan、RoutePlanPlace 和路线入口状态

- [x] Task 12: 验证、测试与质量检查
  - [x] SubTask 12.1: 补充后端单元测试或接口测试，覆盖地点 CRUD、重复检测和错误响应
  - [x] SubTask 12.2: 补充前端组件或交互测试，覆盖搜索、列表、分组和详情管理
  - [x] SubTask 12.3: 执行项目已有 lint、typecheck、test、build 命令
  - [x] SubTask 12.4: 验证没有敏感 Key、数据库密码或令牌被写入仓库文件

# Task Dependencies

- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3
- Task 5 depends on Task 2
- Task 6 depends on Task 4 and Task 5
- Task 7 depends on Task 5 and Task 6
- Task 8 depends on Task 4, Task 5 and Task 7
- Task 9 depends on Task 6, Task 7 and Task 8
- Task 10 depends on Task 6 and Task 9
- Task 11 depends on Task 3 and can run in parallel with Tasks 4-10 where files do not conflict
- Task 12 depends on Tasks 2-11