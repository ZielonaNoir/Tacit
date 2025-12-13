/**
 * Google Fonts 配置
 * 支持灵活的主题字体配置
 */

export interface FontOption {
  name: string
  googleFont: string
  category: 'serif' | 'sans-serif' | 'monospace' | 'display'
  weights?: string[]
  description: string
}

export const availableFonts: FontOption[] = [
  // Sans-serif (现代、简洁)
  {
    name: 'Inter',
    googleFont: 'Inter',
    category: 'sans-serif',
    weights: ['400', '500', '600', '700', '800', '900'],
    description: '现代无衬线字体，适合 UI 和正文'
  },
  {
    name: 'Space Grotesk',
    googleFont: 'Space+Grotesk',
    category: 'sans-serif',
    weights: ['400', '500', '600', '700'],
    description: '几何无衬线字体，现代感强'
  },
  {
    name: 'IBM Plex Sans',
    googleFont: 'IBM+Plex+Sans',
    category: 'sans-serif',
    weights: ['400', '500', '600', '700'],
    description: 'IBM 设计，科技感字体'
  },
  
  // Display (展示用，适合标题)
  {
    name: 'Chonburi',
    googleFont: 'Chonburi',
    category: 'display',
    weights: ['400'],
    description: '泰式装饰字体，适合标题'
  },
  {
    name: 'Bungee',
    googleFont: 'Bungee',
    category: 'display',
    weights: ['400'],
    description: '粗体展示字体，Neo-Brutalism 风格'
  },
  {
    name: 'Black Ops One',
    googleFont: 'Black+Ops+One',
    category: 'display',
    weights: ['400'],
    description: '军事风格，粗壮有力'
  },
  {
    name: 'Orbitron',
    googleFont: 'Orbitron',
    category: 'display',
    weights: ['400', '500', '600', '700', '800', '900'],
    description: '未来科技感，适合 Y2K 风格'
  },
  
  // Serif (衬线，复古感)
  {
    name: 'Playfair Display',
    googleFont: 'Playfair+Display',
    category: 'serif',
    weights: ['400', '500', '600', '700', '800', '900'],
    description: '优雅衬线字体，复古优雅'
  },
  {
    name: 'Merriweather',
    googleFont: 'Merriweather',
    category: 'serif',
    weights: ['400', '700'],
    description: '阅读友好，适合长文本'
  },
  
  // Monospace (等宽，代码/技术感)
  {
    name: 'JetBrains Mono',
    googleFont: 'JetBrains+Mono',
    category: 'monospace',
    weights: ['400', '500', '600', '700'],
    description: '编程字体，技术感强'
  },
  {
    name: 'Fira Code',
    googleFont: 'Fira+Code',
    category: 'monospace',
    weights: ['400', '500', '600', '700'],
    description: '等宽字体，支持连字'
  },
  {
    name: 'Courier Prime',
    googleFont: 'Courier+Prime',
    category: 'monospace',
    weights: ['400', '700'],
    description: '经典打字机字体'
  }
]

/**
 * 根据字体名称生成 Google Fonts URL
 */
export function getGoogleFontsUrl(fonts: FontOption[]): string {
  const families = fonts.map(font => {
    const weights = font.weights?.join(';') || '400'
    return `${font.googleFont}:wght@${weights}`
  }).join('&family=')
  
  return `https://fonts.googleapis.com/css2?family=${families}&display=swap`
}

/**
 * 根据主题预设推荐字体
 */
export const themeFontPresets: Record<string, FontOption> = {
  'default': availableFonts.find(f => f.name === 'Inter')!,
  'neon-nights': availableFonts.find(f => f.name === 'Orbitron')!,
  'retro-paper': availableFonts.find(f => f.name === 'Chonburi')!,
  'y2k-glitch': availableFonts.find(f => f.name === 'JetBrains Mono')!
}

/**
 * 动态加载字体
 */
export function loadFont(font: FontOption): Promise<void> {
  return new Promise((resolve, reject) => {
    // 检查字体是否已加载
    if (document.fonts.check(`16px "${font.name}"`)) {
      resolve()
      return
    }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = getGoogleFontsUrl([font])
    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`Failed to load font: ${font.name}`))
    document.head.appendChild(link)
  })
}

