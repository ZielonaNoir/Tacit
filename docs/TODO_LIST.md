# Tacit 项目待办事项清单

基于 `PRD_UNIMPLEMENTED_FEATURES.md` 整理的功能实现任务列表。

**最后更新**: 2025-12-15

---

## 🔴 高优先级（核心功能）

### 1. 日期投票增强功能
- [ ] **智能推荐算法** - 计算投票交集，标记 "Most Popular" 选项
- [ ] **Host 锁定日期** - 实现 "Lock this date" 按钮
- [ ] **状态更新** - 锁定后更新 `events.status` (polling → scheduled)
- [ ] **自动通知** - 锁定后触发 System Blast，通知所有已投票用户

**相关文件**: 
- `src/modules/events/views/EventDetail.vue`
- `src/modules/polling/services.ts`

---

### 2. Guest List 管理完善
- [ ] **+1s 管理界面** - 允许携带同伴并注明人数
- [ ] **Host Controls: Remove** - 踢人功能
- [ ] **Host Controls: Mark as Paid** - 手动标记已付款
- [ ] **状态筛选界面** - Guest List 状态筛选

**相关文件**:
- `src/modules/events/components/GuestList.vue`
- `src/modules/events/views/EventDetail.vue`

---

### 3. 功能模块显示
- [ ] **Spotify Integration** - 在 EventDetail 页面嵌入播放列表 URL（iframe）
- [ ] **Gift Registry** - 在 EventDetail 页面显示亚马逊/外部链接列表
- [ ] **Dress Code** - 在 EventDetail 页面显示文本提示区
- [ ] **Secret Address** - 仅对 RSVP "Going" 的用户显示具体地址

**相关文件**:
- `src/modules/events/views/EventDetail.vue`

---

### 4. 支付流程（流程 C）
- [ ] **Stripe Connect 账户绑定** - Host 配置 "Chip In" 功能，设定金额
- [ ] **Supabase Edge Function** - 创建 `create-checkout` 函数
- [ ] **Stripe Checkout 集成** - RSVP 时拦截并跳转支付
- [ ] **Stripe Webhook 处理** - 处理支付回调
- [ ] **支付状态字段** - 添加并更新 `rsvps.payment_status` 字段
- [ ] **Host 仪表盘** - 显示支付状态（Pending/Paid）

**相关文件**:
- `supabase/functions/create-checkout/` (需创建)
- `src/modules/events/views/EventDetail.vue`
- `database/migrations/add-payment-status.sql` (需创建)

---

## 🟡 中优先级（重要功能）

### 5. 隐私设置完善
- [ ] **Approval Required** - 实现需审核的 RSVP UI 和逻辑
- [ ] **Guest List Visibility** - 是否允许访客看到其他人的设置

**相关文件**:
- `src/modules/events/components/CreateEventWizard.vue`
- `src/modules/events/views/EventDetail.vue`

---

### 6. Text Blast 短信系统
- [ ] **Twilio/SNS 集成** - 集成短信服务
- [ ] **批量发送功能** - Host 输入消息 → 批量发送给所有收集了手机号的 Guest
- [ ] **支持图片附件** - Text Blast 附带图片

**相关文件**:
- `supabase/functions/send-text-blast/` (需创建)
- `src/modules/events/components/ActivityFeed.vue`

---

### 7. 组织功能（Organizations）
- [ ] **Org Profile 页面** - Logo 上传、简介编辑、社交链接
- [ ] **Event Hub** - 聚合显示该组织下的所有活动（Upcoming/Past）
- [ ] **Subscribe 功能** - 访客订阅组织
- [ ] **自动通知** - 新活动自动短信/邮件通知订阅者
- [ ] **Team Roles 管理** - Owner/Admin/Member 角色管理

**相关文件**:
- `src/modules/organizations/` (需创建)
- `database/schema.sql` (表已存在)

---

### 8. 视觉增强
- [ ] **Hero Poster** - 全屏活动海报
- [ ] **图片上传** - 支持上传图片或使用 Unsplash
- [ ] **预设主题** - Neon Nights, Retro Paper, Y2K Glitch
- [ ] **字体动态加载** - Google Fonts 动态加载
- [ ] **Reaction Bubbles** - 点击屏幕任意位置飘起 Emoji 气泡

**相关文件**:
- `src/modules/events/views/EventDetail.vue`
- `src/lib/theme.ts` (需创建)

---

## 🟢 低优先级（增强功能）

### 9. Photo Roll 完善
- [ ] **照片上传功能完善** - 基础已实现，需完善
- [ ] **横向滚动展示** - 类似 Snapchat Stories

**相关文件**:
- `src/modules/feed/components/ActivityFeed.vue`

---

### 10. 工具功能
- [ ] **Calendar Sync** - 生成 .ics 文件
- [ ] **Google Calendar 直连** - 直连 Google Calendar
- [ ] **Outlook 直连** - 直连 Outlook
- [ ] **Maps 集成** - Mapbox/Google Static Maps
- [ ] **导航功能** - 点击跳转导航

**相关文件**:
- `src/modules/events/views/EventDetail.vue`
- `src/lib/calendar.ts` (需创建)
- `src/lib/maps.ts` (需创建)

---

## 📊 任务统计

### 按优先级
- 🔴 **高优先级**: 24 个任务
- 🟡 **中优先级**: 13 个任务
- 🟢 **低优先级**: 9 个任务
- **总计**: 46 个任务

### 按模块分类
- **支付流程**: 6 个任务
- **日期投票**: 4 个任务
- **Guest List**: 4 个任务
- **功能模块**: 4 个任务
- **组织功能**: 5 个任务
- **视觉增强**: 5 个任务
- **Text Blast**: 3 个任务
- **隐私设置**: 2 个任务
- **Photo Roll**: 2 个任务
- **工具功能**: 5 个任务
- **其他**: 6 个任务

---

## 🎯 推荐实现顺序

### 第一阶段（核心功能）
1. 日期投票增强功能（4 个任务）
2. Guest List 管理完善（4 个任务）
3. 功能模块显示（4 个任务）

### 第二阶段（重要功能）
4. 支付流程（6 个任务）
5. 隐私设置完善（2 个任务）
6. Text Blast 短信系统（3 个任务）

### 第三阶段（增强功能）
7. 组织功能（5 个任务）
8. 视觉增强（5 个任务）
9. Photo Roll 完善（2 个任务）
10. 工具功能（5 个任务）

---

## 📝 数据库更新需求

### 需要添加的字段

1. **`rsvps` 表**:
   ```sql
   ALTER TABLE rsvps ADD COLUMN payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded'));
   ALTER TABLE rsvps ADD COLUMN approved BOOLEAN DEFAULT false;
   ```

2. **`events` 表**:
   - `approval_required` - 已存在 ✅
   - `show_guest_list` - 已存在 ✅

---

## 🔗 相关文档

- **PRD 文档**: `docs/Tacit PRD.md`
- **未实现功能清单**: `docs/PRD_UNIMPLEMENTED_FEATURES.md`
- **实现状态**: `docs/IMPLEMENTATION_STATUS.md`
- **数据库 Schema**: `database/schema/schema.sql`

---

## 💡 开发提示

1. **优先实现核心流程** - 确保基本功能可用
2. **模块化开发** - 每个功能独立实现，便于测试
3. **数据库迁移** - 使用 `database/migrations/` 目录管理数据库变更
4. **测试驱动** - 实现功能前先编写测试用例

