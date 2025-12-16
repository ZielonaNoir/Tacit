# Tacit 功能实现状态

## ✅ 已完成功能

### 1. 向导式活动创建页面
- **文件**: `src/modules/events/components/CreateEventWizard.vue`
- **特性**:
  - 5 步向导式流程
  - 填空句式："[Name] is hosting [Event] on [Date]"
  - 实时手机预览
  - Neo-Brutalism 设计风格（黑色背景、珊瑚粉色、白色文字）
  - 支持"待定日期"模式（Date Polling）
  - 功能模块配置（Spotify、Gift Registry、Dress Code、Chip In）
  - 主题和隐私设置

### 2. Activity Feed（动态流）
- **文件**: `src/modules/feed/components/ActivityFeed.vue`
- **特性**:
  - Text Blasts（主持人广播）
  - RSVP Logs（系统自动记录）
  - Comments（评论）
  - Photos（照片上传，待完善）
  - 实时更新（Supabase Realtime）
  - 时间格式化显示

### 3. 混合身份系统
- **文件**: `src/composables/useGuestIdentity.ts`
- **特性**:
  - 匿名访客 UUID 管理
  - LocalStorage 持久化
  - 自动同步到后端

### 4. 认证系统
- **文件**: `src/composables/useAuth.ts`, `src/modules/auth/views/*.vue`
- **特性**:
  - 登录/注册页面（Neo-Brutalism 风格）
  - 自动创建 Profile
  - 路由守卫保护

### 5. 日期投票基础功能
- **文件**: `src/modules/events/views/EventDetail.vue`
- **特性**:
  - 时间选项投票
  - 三种状态：Can do / If need be / Can't do
  - 实时票数统计

## 🚧 部分完成功能

### 6. 活动详情页面
- **文件**: `src/modules/events/views/EventDetail.vue`
- **待完善**:
  - 集成 ActivityFeed 组件
  - 模块显示（Spotify、Gift Registry 等）
  - Guest List 管理界面
  - Host Controls（锁定日期、踢人等）

## 📋 待实现功能

### 高优先级
1. **日期投票增强**
   - 智能推荐（计算最受欢迎的时间）
   - Host 锁定日期功能
   - 锁定后自动通知投票者

2. **Guest List 管理**
   - +1s 管理界面
   - Host Controls（Remove、Mark as Paid）
   - 状态筛选

3. **模块系统显示**
   - Spotify 播放列表嵌入
   - Gift Registry 列表显示
   - Dress Code 提示
   - Secret Address（仅对 RSVP 用户显示）

4. **主题引擎**
   - 预设主题应用
   - 动态特效（Confetti、Emoji 飘落等）
   - 字体动态加载

### 中优先级
5. **Text Blast 短信系统**
   - Twilio/SNS 集成
   - 批量发送短信
   - 支持图片附件

6. **组织功能**
   - Org Profile 页面
   - Event Hub
   - 订阅功能

### 低优先级
7. **支付集成**
   - Stripe Connect 集成
   - Checkout 流程
   - Webhook 处理

8. **工具功能**
   - 日历同步（.ics 导出）
   - 地图集成（Google Maps）
   - 短链接复制

## 📁 文件结构

```
src/
├── modules/
│   ├── events/
│   │   ├── components/
│   │   │   └── CreateEventWizard.vue ✅
│   │   ├── views/
│   │   │   ├── CreateEvent.vue (简单版本)
│   │   │   ├── EventDetail.vue 🚧
│   │   │   └── HomeView.vue ✅
│   │   └── services.ts ✅
│   ├── feed/
│   │   ├── components/
│   │   │   └── ActivityFeed.vue ✅
│   │   └── services.ts ✅
│   └── auth/
│       └── views/
│           ├── LoginView.vue ✅
│           └── RegisterView.vue ✅
├── composables/
│   ├── useAuth.ts ✅
│   └── useGuestIdentity.ts ✅
└── types/
    └── database.ts ✅
```

## 🔧 下一步操作

### 立即需要做的：

1. **集成 ActivityFeed 到 EventDetail**
   ```vue
   <ActivityFeed :event-id="event.id" :is-host="isHost" />
   ```

2. **完善日期投票**
   - 添加"锁定日期"按钮（仅 Host 可见）
   - 计算并标记"Most Popular"
   - 锁定后更新事件状态并通知

3. **显示模块内容**
   - 在 EventDetail 中渲染 modules_config 的内容
   - Spotify iframe 嵌入
   - Gift Registry 链接列表

4. **Guest List 管理界面**
   - 创建 GuestList 组件
   - 添加 +1s 输入
   - Host Controls 按钮组

## 📝 数据库 Schema 更新需求

某些功能可能需要额外的数据库字段：

1. **RSVPs 表**
   - `payment_status` (paid/pending/refunded) - 支付状态
   - `approved` (boolean) - 是否需要审核

2. **Events 表**
   - `approval_required` (boolean) - 是否需要审核 RSVP

3. **Activities 表**
   - 已完整，无需修改

## 🎨 设计风格说明

所有新组件都遵循 Neo-Brutalism 风格：
- **背景**: 黑色 (`bg-black`)
- **强调色**: 珊瑚粉色 (`bg-coral-pink`, `border-coral-pink`)
- **文字**: 白色 (`text-white`)
- **边框**: 粗边框 (`border-4 border-black`)
- **阴影**: 硬阴影 (`shadow-[6px_6px_0_0_#000]`)
- **字体**: 粗体、大写、字母间距 (`font-black uppercase tracking-wider`)

## 🚀 快速开始

1. 使用新的向导式创建页面：
   - 访问 `/events/create`
   - 填写 5 步表单
   - 查看实时预览

2. 查看 Activity Feed：
   - 在 EventDetail 中集成 `<ActivityFeed>` 组件
   - 实时查看活动动态

3. 测试匿名访客功能：
   - 清除 LocalStorage
   - 访问活动页面
   - 系统自动生成 UUID

