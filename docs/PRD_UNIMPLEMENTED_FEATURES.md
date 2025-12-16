# PRD 未实现功能清单

基于 `Tacit PRD.md` 和当前实现状态的对比分析。

---

## 🔴 核心流程未实现

### 流程 C: 定额 AA 支付流程 (Split Payments)
**状态**: ❌ 完全未实现

**功能点**:
- [ ] Host 配置 "Chip In" 功能，设定金额
- [ ] Stripe Connect 账户绑定
- [ ] RSVP 时拦截并跳转支付
- [ ] Supabase Edge Function (`create-checkout`)
- [ ] Stripe Checkout 集成
- [ ] Stripe Webhook 处理支付回调
- [ ] `rsvps.payment_status` 字段更新
- [ ] Host 仪表盘显示支付状态（Pending/Paid）

**优先级**: 🔴 高（核心功能）

---

## 🟡 流程 B 未完成部分

### 日期投票增强功能
**状态**: 🚧 部分实现（基础投票已实现）

**缺失功能**:
- [ ] **智能推荐**: 系统自动计算交集，标记 "Most Popular" 选项
- [ ] **Host 锁定日期**: 点击 "Lock this date" 按钮
- [ ] **状态更新**: 锁定后更新 `events.status` (`polling` → `scheduled`)
- [ ] **自动通知**: 锁定后触发 System Blast，通知所有已投票用户

**优先级**: 🟡 高

---

## 🟡 A. 视觉与体验 (Vibe & Aesthetics)

### 1. 动态着陆页 (Landing Page)
**状态**: ❌ 未实现

**功能点**:
- [ ] **Hero Poster**: 全屏活动海报
  - [ ] 支持上传图片
  - [ ] 支持使用 Unsplash
- [ ] **Theming Engine 预设主题**:
  - [ ] "Neon Nights" 预设
  - [ ] "Retro Paper" 预设
  - [ ] "Y2K Glitch" 预设
- [ ] **字体动态加载**: Google Fonts (Chonburi, Inter, Space Mono)

### 2. 交互特效
**状态**: 🚧 部分实现

**已实现**:
- ✅ Confetti 飘落动画
- ✅ Emoji 飘落动画
- ✅ Hover States（按钮悬停效果）

**未实现**:
- [ ] **Reaction Bubbles**: 点击屏幕任意位置或 Feed 动态，飘起 Emoji 气泡

**优先级**: 🟡 中

---

## 🟡 B. 活动管理 (Event Management)

### 功能模块显示
**状态**: 🚧 部分实现（配置已实现，显示未实现）

**未实现**:
- [ ] **Spotify Integration**: 在 EventDetail 页面嵌入播放列表 URL（iframe）
- [ ] **Gift Registry**: 在 EventDetail 页面显示亚马逊/外部链接列表
- [ ] **Dress Code**: 在 EventDetail 页面显示文本提示区
- [ ] **Secret Address**: 仅对 RSVP "Going" 的用户显示具体地址

### 隐私设置
**状态**: 🚧 部分实现

**已实现**:
- ✅ 公开/私有活动 (`is_public`)
- ✅ Invite Card 系统

**未实现**:
- [ ] **Approval Required**: 需审核的 RSVP（`approval_required` 字段已存在，但 UI 和逻辑未实现）
- [ ] **Guest List Visibility**: 是否允许访客看到其他人的设置

**优先级**: 🟡 高

---

## 🔴 C. 组织与社群 (Organizations)

**状态**: ❌ 完全未实现

**功能点**:
- [ ] **Org Profile**: 组织专属主页
  - [ ] Logo 上传
  - [ ] 简介编辑
  - [ ] 社交链接
- [ ] **Event Hub**: 聚合显示该组织下的所有活动
  - [ ] "Upcoming" 活动列表
  - [ ] "Past" 活动列表
- [ ] **Subscribe**: 访客订阅组织
  - [ ] 订阅按钮/表单
  - [ ] 新活动自动短信/邮件通知
- [ ] **Team Roles**: 团队角色管理
  - [ ] Owner（完全控制）
  - [ ] Admin（编辑活动）
  - [ ] Member（仅发布）

**数据库表**: `organizations`, `org_members` 已存在，但功能未实现

**优先级**: 🟡 中

---

## 🟡 D. 社交与互动 (Social & Feed)

### Activity Feed
**状态**: ✅ 基础功能已实现

**已实现**:
- ✅ Text Blasts（主持人广播）
- ✅ RSVP Logs（系统自动记录）
- ✅ Comments（评论）
- ✅ 实时更新（Supabase Realtime）

**未完善**:
- [ ] **User Photos**: "Photo Roll" 功能完善
  - [ ] 照片上传功能（基础已实现，需完善）
  - [ ] 横向滚动展示（类似 Snapchat Stories）

### Text Blast System (短信广播)
**状态**: ❌ 未实现

**功能点**:
- [ ] Twilio/SNS 集成
- [ ] Host 输入消息 → 批量发送给所有收集了手机号的 Guest
- [ ] 支持附带图片

**优先级**: 🟡 中

---

## 🟡 E. 身份与数据 (Identity & Data)

### Guest List Management
**状态**: 🚧 部分实现（基础 RSVP 已实现）

**已实现**:
- ✅ 状态分类: Going, Maybe, Can't Go, Waitlist
- ✅ Guest List 显示（基础）

**未实现**:
- [ ] **+1s Management**: 允许携带同伴并注明人数
  - [ ] UI 输入界面
  - [ ] 数据库字段更新（`rsvps.guests_count` 已存在）
- [ ] **Host Controls**:
  - [ ] 踢人 (Remove) 功能
  - [ ] 手动标记已付款 (Mark as Paid)
  - [ ] 状态筛选界面

**优先级**: 🟡 高

---

## 🟢 F. 工具与实用程序 (Utilities)

**状态**: 🚧 部分实现

**已实现**:
- ✅ Copy Invite（一键复制链接）

**未实现**:
- [ ] **Calendar Sync**:
  - [ ] 生成 `.ics` 文件
  - [ ] 直连 Google Calendar
  - [ ] 直连 Outlook
- [ ] **Maps**:
  - [ ] 集成 Mapbox/Google Static Maps
  - [ ] 点击跳转导航

**优先级**: 🟢 低

---

## 📊 实现进度统计

### 按模块分类

| 模块 | 状态 | 完成度 |
|------|------|--------|
| 核心流程 A (匿名参与) | ✅ 已实现 | 100% |
| 核心流程 B (日期投票) | 🚧 部分实现 | 60% |
| 核心流程 C (支付流程) | ❌ 未实现 | 0% |
| 视觉与体验 | 🚧 部分实现 | 50% |
| 活动管理 | 🚧 部分实现 | 70% |
| 组织与社群 | ❌ 未实现 | 0% |
| 社交与互动 | 🚧 部分实现 | 70% |
| 身份与数据 | 🚧 部分实现 | 80% |
| 工具与实用程序 | 🚧 部分实现 | 30% |

### 总体完成度: 约 55%

---

## 🎯 推荐实现优先级

### 🔴 高优先级（核心功能）

1. **日期投票增强**
   - 智能推荐算法
   - Host 锁定日期功能
   - 锁定后通知系统

2. **Guest List 管理完善**
   - +1s 管理界面
   - Host Controls（Remove、Mark as Paid）

3. **模块系统显示**
   - Spotify 播放列表嵌入
   - Gift Registry 列表显示
   - Dress Code 提示
   - Secret Address（条件显示）

### 🟡 中优先级（重要功能）

4. **支付集成**（流程 C）
   - Stripe Connect 集成
   - Checkout 流程
   - Webhook 处理

5. **Text Blast 短信系统**
   - Twilio/SNS 集成
   - 批量发送功能

6. **组织功能**
   - Org Profile 页面
   - Event Hub
   - 订阅功能

### 🟢 低优先级（增强功能）

7. **视觉增强**
   - Hero Poster
   - 预设主题
   - Reaction Bubbles
   - 字体动态加载

8. **工具功能**
   - 日历同步
   - 地图集成

---

## 📝 数据库字段需求

### 需要添加的字段

1. **`rsvps` 表**:
   - `payment_status` (text: 'pending' | 'paid' | 'refunded') - 支付状态
   - `approved` (boolean) - 是否需要审核（如果 `events.approval_required = true`）

2. **`events` 表**:
   - `approval_required` (boolean) - 已存在 ✅
   - `show_guest_list` (boolean) - 已存在 ✅

3. **`organizations` 表**:
   - 表已存在，但需要完善字段和功能

---

## 🔗 相关文件

- **PRD 文档**: `Tacit PRD.md`
- **实现状态**: `IMPLEMENTATION_STATUS.md`
- **数据库 Schema**: `database/schema.sql`
