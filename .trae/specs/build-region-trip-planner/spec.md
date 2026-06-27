# 区域聚合游玩路线规划工具 Spec

## Why
年轻旅行者的心愿地点常分散在截图、收藏夹和备忘录中，缺少统一的地理管理与邻近关系判断。该项目需要把 PRD 转化为可执行的 MVP 技术规格，优先完成“地点收集、地图展示、街道级聚合、心愿单管理”的闭环，并为后续路线规划能力保留清晰扩展路径。

## What Changes
- 建立 React + TypeScript + Vite 前端工程，承载地图主画布、搜索输入、侧边面板、地点详情、聚合气泡等核心界面。
- 建立 Go + Gin + GORM 后端工程，提供地点 CRUD、高德 Web 服务代理、路线数据扩展接口基础。
- 使用 MySQL 8.0+ 存储地点与路线规划数据，避免仅依赖 localStorage 导致多端与长期数据不可控。
- 接入高德地图 JS API 2.0 展示中国地图底图，支持缩放、拖拽、标记渲染和街道级聚合展示。
- 接入高德 POI 搜索、逆地理编码、行政区划、路线距离估算等能力，并通过后端环境变量保护 Web 服务 Key。
- 实现 P0 MVP：地图底图、地点搜索添加、街道级聚合气泡、标记详情管理、侧边面板全部/分组视图。
- 预留 P1 路线规划能力的数据模型、接口边界和前端状态结构，但不强制在首个 MVP 交付中完成完整路线执行与分享。
- **BREAKING**：PRD 中“数据完全本地 localStorage”与“自建 MySQL 数据库”存在冲突，本规格以 MySQL 为主存储，localStorage 仅用于前端缓存、草稿、离线降级和 UI 偏好。
- **BREAKING**：PRD 中明文出现地图服务 Key 与安全密钥，后续实现不得把这些值写入前端源码、仓库配置或日志；需要迁移到环境变量，并建议立即轮换已暴露 Key。

## Impact
- Affected specs: 地图底图、地点搜索添加、街道级聚合、地点管理、侧边面板、路线规划预留、数据存储、安全隐私、非功能性能。
- Affected code: 前端 React 应用、地图 SDK 加载模块、地点状态管理、API 客户端、后端 Gin 路由、GORM 模型、数据库迁移、高德 API 代理、配置管理。

## ADDED Requirements

### Requirement: 项目工程基础
系统 SHALL 提供前后端分离的工程结构，前端使用 React 18 + TypeScript + Vite，后端使用 Go 1.22+ + Gin + GORM，数据库使用 MySQL 8.0+。

#### Scenario: 工程可启动
- **WHEN** 开发者按照项目说明配置依赖、数据库和环境变量
- **THEN** 前端开发服务、后端 API 服务和数据库连接均可正常启动

#### Scenario: 配置安全
- **WHEN** 应用需要访问高德 Web 服务 API Key 或数据库凭据
- **THEN** 后端 SHALL 从环境变量或本地未提交配置读取，不得硬编码到源码中

### Requirement: 地图底图能力
系统 SHALL 展示基于高德 JS API 2.0 的中国地图主画布，支持缩放、拖拽、双击放大和触控平移缩放。

#### Scenario: 首次打开地图
- **WHEN** 用户首次访问应用
- **THEN** 页面 SHALL 展示地图主区域、顶部搜索框、侧边面板和空状态引导

#### Scenario: 地图加载失败
- **WHEN** 地图 SDK 或网络加载失败
- **THEN** 页面 SHALL 显示友好错误提示，不得出现永久空白页

### Requirement: 地点搜索与添加
系统 SHALL 支持用户输入至少 2 个字符后触发地点联想搜索，展示最多 8 条结果，并允许用户选择结果添加为心愿地点。

#### Scenario: 添加地点成功
- **WHEN** 用户选择搜索结果
- **THEN** 系统 SHALL 获取地点名称、地址、经纬度、行政区划信息并创建地点记录
- **AND** 地图 SHALL 平移到该地点并显示标记
- **AND** 侧边面板 SHALL 新增对应地点

#### Scenario: 完全重复地点
- **WHEN** 用户添加与现有地点同名且位置匹配的地点
- **THEN** 系统 SHALL 阻止重复添加并提示“该地点已在心愿单中”

#### Scenario: 近距离重复地点
- **WHEN** 用户添加距离已有地点小于 100 米但非完全同名的地点
- **THEN** 系统 SHALL 提示附近已存在标记，并允许用户确认后继续添加

### Requirement: 街道级聚合展示
系统 SHALL 基于地点的省、市、区、街道、adcode 或 towncode 进行分组，并在同一街道内地点数量大于等于 2 时展示聚合气泡。

#### Scenario: 街道内多个地点
- **WHEN** 同一街道内存在 2 个或以上地点
- **THEN** 地图 SHALL 在该组地点几何中心显示聚合气泡
- **AND** 气泡 SHALL 显示地点数量

#### Scenario: 缩放层级变化
- **WHEN** 地图 zoom 小于 10
- **THEN** 系统 SHOULD 显示区级聚合
- **WHEN** 地图 zoom 位于 10 到 14
- **THEN** 系统 SHALL 显示街道级聚合
- **WHEN** 地图 zoom 大于 14
- **THEN** 系统 SHALL 展示单个地点标记

#### Scenario: 街道缺失
- **WHEN** 高德逆地理编码未返回街道信息
- **THEN** 地点 SHALL 归属到区级兜底分组，并在详情中标识未识别街道

### Requirement: 标记详情与管理
系统 SHALL 支持用户查看、编辑和删除已添加的心愿地点。

#### Scenario: 查看地点详情
- **WHEN** 用户点击地图标记或列表地点
- **THEN** 系统 SHALL 展示地点名称、地址、行政区划、标签、备注和添加时间

#### Scenario: 编辑地点信息
- **WHEN** 用户修改备注或标签
- **THEN** 系统 SHALL 保存变更并同步刷新地图与侧边面板

#### Scenario: 删除地点
- **WHEN** 用户确认删除地点
- **THEN** 系统 SHALL 移除该地点记录、地图标记，并重新计算聚合气泡与分组列表

### Requirement: 侧边面板
系统 SHALL 提供可折叠侧边面板，包含全部心愿单视图和按街道分组视图。

#### Scenario: 全部视图
- **WHEN** 用户打开全部视图
- **THEN** 系统 SHALL 按添加时间倒序展示全部地点，并支持按地点名称、街道、标签筛选

#### Scenario: 分组视图
- **WHEN** 用户打开分组视图
- **THEN** 系统 SHALL 按城市、区、街道层级展示地点分组及数量

#### Scenario: 地图联动
- **WHEN** 用户点击侧边面板中的地点
- **THEN** 地图 SHALL 平移居中到该地点并打开详情

### Requirement: 后端地点 API
系统 SHALL 提供 REST API 支持地点列表、创建、更新、删除和重复检测。

#### Scenario: 获取地点列表
- **WHEN** 前端请求地点列表
- **THEN** 后端 SHALL 返回所有地点及其标签、备注、行政区划和创建更新时间

#### Scenario: 创建地点
- **WHEN** 前端提交地点创建请求
- **THEN** 后端 SHALL 校验必填字段、执行重复检测、写入数据库并返回创建后的地点

### Requirement: 高德 API 代理
系统 SHALL 通过后端代理调用需要保护 Key 的高德 Web 服务接口，包括逆地理编码、行政区划查询和路线距离估算。

#### Scenario: 逆地理编码代理
- **WHEN** 前端提交经纬度请求行政区划信息
- **THEN** 后端 SHALL 调用高德逆地理编码接口并返回规范化后的省、市、区、街道、adcode、towncode 信息

#### Scenario: API 失败降级
- **WHEN** 高德接口失败或超时
- **THEN** 后端 SHALL 返回结构化错误，前端 SHALL 显示可理解提示或使用可用兜底数据

### Requirement: 数据持久化与缓存
系统 SHALL 以 MySQL 作为主数据源，并可使用 localStorage 保存前端缓存、面板状态和离线提示所需的非敏感数据。

#### Scenario: 刷新页面
- **WHEN** 用户刷新页面
- **THEN** 已创建的地点和路线数据 SHALL 从后端恢复展示

#### Scenario: 网络不可用
- **WHEN** 前端无法连接后端
- **THEN** 系统 SHOULD 展示最近缓存的地点数据并提示服务暂时不可用

### Requirement: 路线规划预留
系统 SHALL 在数据模型和接口设计中预留路线计划、路线地点顺序、距离和时间估算字段，支持后续 P1 路线规划实现。

#### Scenario: 生成路线入口
- **WHEN** 某街道分组包含 2 个或以上地点
- **THEN** 分组视图 SHOULD 展示“生成路线”入口
- **AND** MVP 可先展示未开放提示或基础排序结果，完整拖拽保存可进入后续迭代

## MODIFIED Requirements

### Requirement: 数据存储策略
系统 SHALL 采用 MySQL 8.0+ 作为权威持久化数据源，localStorage 仅作为缓存和离线降级辅助。

### Requirement: API Key 管理策略
系统 SHALL 将高德 REST API Key、数据库连接串等敏感配置存放在后端环境变量或未提交的本地配置中；前端仅允许使用受域名白名单限制的高德 JS API Key。

### Requirement: MVP 范围边界
系统 SHALL 优先完成 P0 功能闭环。P1 路线规划、路线管理、导出分享作为扩展能力，首轮实现仅需完成数据结构与接口可扩展性，除非后续任务明确要求纳入 MVP。

## REMOVED Requirements

### Requirement: 明文 Key 写入文档或源码
**Reason**: 明文 Key 与安全密钥已出现在 PRD 中，继续写入源码或配置会造成安全风险。
**Migration**: 立即在高德控制台轮换相关 Key，后续通过环境变量注入，并将示例配置中的值替换为占位符。

### Requirement: 所有数据完全仅本地保存
**Reason**: PRD 的非功能和技术方案已明确采用 MySQL + GORM，纯 localStorage 与后端数据库架构冲突。
**Migration**: 将 MySQL 定义为主存储，localStorage 只承担缓存、离线查看和 UI 状态保存。