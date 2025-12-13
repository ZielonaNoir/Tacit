# 日期投票功能实现计划

## 📋 功能概述

实现智能日期投票系统，支持两个入口：
1. **确定时间**：直接设置活动的开始和结束时间
2. **不确定时间**：通过投票找到最佳时间，支持空闲时间窗口计算

## ✅ 已完成

### 1. 数据库扩展 (`database/add-polling-features.sql`)
- ✅ 添加 `poll_deadline` 字段到 `events` 表
- ✅ 创建 `invite_cards` 表（存储生成的邀请卡）
- ✅ 创建 `notifications` 表（用户通知系统）
- ✅ 创建 `user_availability` 表（用户可用时间）
- ✅ 创建 RLS 策略
- ✅ 创建 `generate_invite_code()` 函数
- ✅ 创建 `check_poll_deadline()` 辅助函数

### 2. TypeScript 类型定义
- ✅ 更新 `TacitEvent` 接口（添加 `poll_deadline`）
- ✅ 添加 `InviteCard` 接口
- ✅ 添加 `Notification` 接口
- ✅ 添加 `UserAvailability` 接口
- ✅ 添加 `FreeTimeWindow` 接口（空闲时间窗口）

### 3. 服务函数 (`src/modules/polling/services.ts`)
- ✅ `calculateFreeTimeWindows()` - 计算重叠空闲时间
- ✅ `fetchEventAvailabilities()` - 获取活动可用时间
- ✅ `submitAvailability()` - 提交用户可用时间
- ✅ `generateInviteCard()` - 生成邀请卡
- ✅ `fetchEventInviteCards()` - 获取活动邀请卡
- ✅ `fetchInviteCardByCode()` - 通过邀请码查找邀请卡
- ✅ `fetchUserNotifications()` - 获取用户通知
- ✅ `markNotificationRead()` - 标记通知已读

## 🔄 待实现

### 1. UI 组件

#### a. CreateEventWizard 改进
- [ ] 添加两个入口选择：**确定时间** vs **不确定时间（投票）**
- [ ] 如果选择"不确定时间"，显示：
  - 调研截止时间设置
  - 时间段选项添加（时间槽）
  - 实时空闲时间窗口预览

#### b. 空闲时间选择器组件 (`AvailabilityPicker.vue`)
- [ ] 日历视图选择可用时间
- [ ] 时间槽选择（拖拽或点击）
- [ ] 实时显示与其他参与者的重叠时间

#### c. 空闲时间窗口显示组件 (`FreeTimeWindows.vue`)
- [ ] 显示计算出的重叠时间窗口
- [ ] 显示每个窗口的参与者数量
- [ ] 高亮最受欢迎的时间窗口

#### d. InviteCard 组件 (`InviteCard.vue`)
- [ ] 显示邀请卡样式
- [ ] 匿名用户：手动输入 ID
- [ ] 已登录用户：自动填写信息
- [ ] 评论/留言功能
- [ ] 分享功能

#### e. 通知中心组件 (`NotificationCenter.vue`)
- [ ] 显示未读通知数量
- [ ] 通知列表
- [ ] 标记已读功能

### 2. 后端功能

#### a. 截止时间监控（Supabase Edge Function）
- [ ] 创建 Edge Function：`check-poll-deadline`
- [ ] 定时检查已过期的投票活动
- [ ] 自动生成邀请卡
- [ ] 发送通知给主持人
- [ ] 发送通知给有账户的参与者

#### b. 邀请卡生成逻辑
- [ ] 为每个 RSVP 参与者生成邀请卡
- [ ] 为匿名用户创建 invite link
- [ ] 为主持人生成汇总邀请卡列表

### 3. 事件详情页改进

#### a. 日期投票模式 (`EventDetail.vue`)
- [ ] 显示调研截止时间倒计时
- [ ] 显示空闲时间窗口计算结果
- [ ] 显示参与者可用时间提交情况
- [ ] 主持人可以查看生成的邀请卡列表

#### b. 邀请卡访问页面 (`InviteCardView.vue`)
- [ ] 路由：`/events/:eventId/invite/:code`
- [ ] 显示活动信息
- [ ] 匿名用户身份识别
- [ ] RSVP 提交

### 4. 主持人功能

#### a. 邀请卡管理
- [ ] 查看所有生成的邀请卡
- [ ] 批量复制邀请链接
- [ ] 查看邀请卡状态（sent/opened/responded）
- [ ] 手动发送邀请卡

#### b. 投票截止管理
- [ ] 设置/修改调研截止时间
- [ ] 提前结束投票
- [ ] 锁定最终时间

## 🔧 技术实现细节

### 空闲时间窗口计算算法

```typescript
// 算法逻辑：
// 1. 收集所有参与者的可用时间槽
// 2. 找到所有时间的开始和结束范围
// 3. 按 30 分钟粒度切片检查重叠
// 4. 合并相邻的可用窗口
// 5. 返回所有参与者都可用的时间窗口
```

### 通知流程

```
投票截止时间到达
  ↓
Edge Function 触发
  ↓
计算最终时间（基于投票结果）
  ↓
生成邀请卡（为每个参与者）
  ↓
   ├─→ 有账户用户 → 创建通知 → 应用内通知
   └─→ 匿名用户 → 生成邀请卡 → 主持人手动分发
```

### 邀请卡访问流程

```
用户访问 /events/:eventId/invite/:code
  ↓
检查邀请码有效性
  ↓
   ├─→ 已登录 → 自动填写用户信息
   └─→ 匿名 → 显示 ID 输入框
  ↓
提交 RSVP 或评论
  ↓
更新邀请卡状态为 'responded'
```

## 📝 下一步行动

1. **立即执行**：
   - 在 Supabase 中运行 `database/add-polling-features.sql`
   - 测试数据库结构是否正确

2. **优先级高**：
   - 实现 CreateEventWizard 的两个入口
   - 实现空闲时间窗口计算和显示
   - 创建 InviteCard 组件

3. **优先级中**：
   - 实现 Edge Function 监控截止时间
   - 实现通知系统
   - 完善邀请卡管理界面

4. **优先级低**：
   - 优化空闲时间计算算法
   - 添加更多通知类型
   - 优化用户体验细节

## 🎯 成功标准

- [ ] 主持人可以创建投票式活动并设置截止时间
- [ ] 参与者可以提交可用时间
- [ ] 系统能实时计算并显示空闲时间窗口
- [ ] 截止时间到达后自动生成邀请卡
- [ ] 有账户用户收到通知
- [ ] 匿名用户可以通过邀请码访问并参与
- [ ] 主持人可以管理所有邀请卡

