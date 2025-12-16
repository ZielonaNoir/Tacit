# RSVP 批准逻辑说明

## 当前逻辑

### 1. **Require Approval for RSVP 的作用**

- **启用条件**：在创建/编辑活动时，勾选 "Require Approval for RSVP" 选项
- **生效规则**：
  - ✅ **只有选择 "Going" 时才需要批准**：当用户点击 "Going" 按钮时，RSVP 状态会被设置为 `waitlist`
  - ❌ **选择 "Maybe" 或 "Can't Go" 时不需要批准**：直接保存为对应的状态

### 2. **批准功能**

- **谁可以批准**：只有活动主持人（Host，即活动创建者）可以看到并点击 "Approve" 按钮
- **批准对象**：
  - ✅ **登录用户**：可以批准
  - ✅ **匿名用户（Guest）**：也可以批准
  - ✅ **所有 waitlist 状态的 RSVP**：无论是否登录，只要状态是 `waitlist`，Host 都能看到批准按钮

### 3. **当前存在的问题**

⚠️ **RLS 策略限制**：
- 当前数据库的 RLS 策略只允许用户更新自己的 RSVP
- Host 无法更新其他人的 RSVP（包括批准操作）
- 这会导致批准功能失败，返回权限错误

### 4. **需要修复的内容**

需要添加一个新的 RLS 策略，允许活动创建者更新他们活动中的所有 RSVP。

## 批准流程

1. **用户提交 RSVP**：
   - 如果 `approval_required = true` 且选择 "Going" → 状态设为 `waitlist`
   - 其他情况 → 直接保存对应状态

2. **Host 批准**：
   - Host 在 Guest List 中看到 waitlist 状态的 RSVP
   - 点击 "Approve" 按钮
   - RSVP 状态从 `waitlist` 更新为 `going`

3. **显示状态**：
   - Waitlist 中的 RSVP 会显示 "Pending" 标签
   - 批准后状态变为 "Going"

