# Assets 目录说明

## 目录结构

```
assets/
├── images/          # 图片资源
│   ├── image-01.jpg
│   ├── image-02.jpg
│   └── ...
└── README.md        # 本文件
```

## 图片文件

所有图片文件已整理到 `images/` 子目录中，并使用统一的命名规范：
- 格式：`image-XX.jpg`
- 编号从 01 开始递增

## 使用方式

在代码中引用图片：

```vue
<!-- Vue 组件中 -->
<img src="/assets/images/image-01.jpg" alt="Image" />

<!-- 或使用 import -->
<script setup>
import image01 from '@/assets/images/image-01.jpg'
</script>
```

## 注意事项

- 图片文件已从根目录移动到 `images/` 子目录
- 文件名已从中文改为英文编号格式
- 如果代码中有引用旧路径，需要更新

