# Iconify 图标使用说明

## 当前使用的图标包

本项目使用 [Iconify](https://icon-sets.iconify.design/) 图标库，当前使用以下图标包：

### 1. **Material Symbols** (`material-symbols:*`)
- **来源**: Google Material Design 3
- **图标数量**: 15,067+ 图标
- **风格**: 现代、简洁、圆润
- **许可证**: Apache 2.0

**使用的图标**:
- `material-symbols:palette` - 调色板（主题预设）
- `material-symbols:description` - 文档（Retro Paper 主题）
- `material-symbols:shuffle` - 混乱效果（Y2K Glitch 主题）
- `material-symbols:check` - 选中标记
- `material-symbols:card-giftcard` - 礼物卡片（Gift Registry 模块）
- `material-symbols:checkroom` - 衣架（Dress Code 模块）
- `material-symbols:payments` - 支付（Chip In 模块）

**使用示例**:
```html
<span class="iconify" data-icon="material-symbols:palette"></span>
```

### 2. **Material Design Icons (MDI)** (`mdi:*`)
- **来源**: Material Design Icons Community
- **图标数量**: 7,447+ 图标
- **风格**: Material Design 风格，偏扁平
- **许可证**: Apache 2.0

**使用的图标**:
- `mdi:spotify` - Spotify 图标（Spotify 模块）

**使用示例**:
```html
<span class="iconify" data-icon="mdi:spotify"></span>
```

### 3. **Solar Icons** (`solar:*`)
- **来源**: Solar Icon Set
- **图标数量**: 7,401+ 图标
- **风格**: 现代、线性、可选双色
- **许可证**: CC BY 4.0

**使用的图标**:
- `solar:lightbulb-bold-duotone` - 灯泡（Neon Nights 主题）

**使用示例**:
```html
<span class="iconify" data-icon="solar:lightbulb-bold-duotone"></span>
```

## 如何添加新图标

### 方法 1: 使用 Iconify 搜索

1. 访问 https://icon-sets.iconify.design/
2. 搜索你需要的图标
3. 点击图标查看详情
4. 复制图标 ID（格式：`图标集:图标名`）
5. 在代码中使用：`data-icon="图标集:图标名"`

### 方法 2: 在组件中使用

```vue
<template>
  <!-- 基础用法 -->
  <span class="iconify" data-icon="material-symbols:home"></span>
  
  <!-- 自定义大小和颜色 -->
  <span 
    class="iconify text-2xl" 
    data-icon="mdi:heart"
    style="color: #FF6B6B;"
  ></span>
  
  <!-- 响应式大小 -->
  <span 
    class="iconify text-xl md:text-2xl lg:text-3xl" 
    data-icon="material-symbols:settings"
  ></span>
</template>
```

## 推荐的图标包（适合 Neo-Brutalism 风格）

### 粗体/硬朗风格
- **Bootstrap Icons** (`bootstrap-icons:*`) - 2,078+ 图标，简洁硬朗
- **Heroicons** (`heroicons:*`) - 1,288+ 图标，Modern UI
- **Tabler Icons** (`tabler:*`) - 5,963+ 图标，中性风格

### 技术/未来感
- **Carbon Icons** (`carbon:*`) - 2,404+ 图标，IBM 设计
- **Phosphor** (`ph:*`) - 9,072+ 图标，灵活性强

### 彩色/多色
- **IconPark** (`icon-park:*`) - 2,658+ 图标，支持多色
- **Fluent UI System Icons** (`fluent:*`) - 18,868+ 图标，Microsoft 设计

## 性能优化

Iconify 通过 CDN 加载图标，首次使用时会自动缓存。如需优化：

1. **预加载常用图标**:
```html
<!-- 在 index.html 中预加载 -->
<link rel="preload" href="https://api.iconify.design/material-symbols.json" as="fetch">
```

2. **使用本地图标**（可选）:
```bash
# 安装 @iconify/json 包
pnpm add -D @iconify/json

# 导入特定图标
import { Icon } from '@iconify/vue'
```

## 参考链接

- [Iconify 官网](https://iconify.design/)
- [Iconify 图标集列表](https://icon-sets.iconify.design/)
- [Material Symbols](https://fonts.google.com/icons)
- [Material Design Icons](https://materialdesignicons.com/)
- [Solar Icons](https://www.figma.com/community/file/1166831539721848736)

