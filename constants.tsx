
import { Category, CategoryInfo, DesignStyle } from './types';

export const CATEGORIES: Record<Category, CategoryInfo> = {
  [Category.MOUSEPAD]: {
    id: Category.MOUSEPAD,
    name: '鼠标垫',
    icon: '🖱️',
    basePrice: 49.0,
    baseLeadTime: 2,
    description: '专业电竞级布面，精准操控',
    aspectRatio: '16:9',
    options: [
      { 
        label: '选定材质', 
        key: 'fabric', 
        type: 'select', 
        values: [
          {name: '粗面操控', value: 'control', desc: '精准定位'}, 
          {name: '细面滑快', value: 'speed', extraPrice: 15, extraLeadTime: 1, desc: '极速移动'}
        ] 
      },
      { 
        label: '工业规格', 
        key: 'size', 
        type: 'size', 
        values: [
          {name: '300x250mm', value: 'S'}, 
          {name: '900x400mm', value: 'XL', extraPrice: 40, extraLeadTime: 1}
        ] 
      }
    ]
  },
  [Category.PHONE_CASE]: {
    id: Category.PHONE_CASE,
    name: '手机壳',
    icon: '📱',
    basePrice: 39.0,
    baseLeadTime: 3,
    description: '液态硅胶，全包防摔',
    aspectRatio: '9:19',
    options: [
      { 
        label: '适配机型', 
        key: 'model', 
        type: 'select', 
        values: [
          {name: 'iPhone 15 Pro', value: 'i15p'}, 
          {name: 'Mate 60', value: 'm60', extraPrice: 5}
        ] 
      },
      { 
        label: '外壳材质', 
        key: 'material', 
        type: 'select', 
        values: [
          {name: '磨砂亲肤', value: 'matte'}, 
          {name: '钢化玻璃', value: 'glass', extraPrice: 20, extraLeadTime: 2}
        ] 
      }
    ]
  },
  [Category.TSHIRT]: {
    id: Category.TSHIRT,
    name: '个性T恤',
    icon: '👕',
    basePrice: 129.0,
    baseLeadTime: 4,
    description: '100% 纯棉，高支克重，柔软透气',
    aspectRatio: '1:1',
    options: [
      { 
        label: '选定基础色', 
        key: 'color', 
        type: 'color', 
        values: [
          {name: '云雾白', value: 'white'}, 
          {name: '暗夜黑', value: 'black', extraPrice: 10}, 
          {name: '活力橙', value: 'orange', extraPrice: 15}
        ] 
      },
      { 
        label: '面料规格', 
        key: 'fabric', 
        type: 'fabric', 
        values: [
          {name: '重磅纯棉', value: 'cotton_heavy', desc: '260g / 挺括', extraLeadTime: 1},
          {name: '凉感科技', value: 'dry_fit', extraPrice: 35, extraLeadTime: 2, desc: '吸湿排汗'}
        ]
      },
      { 
        label: '尺寸码数', 
        key: 'size', 
        type: 'size', 
        values: [
          {name: 'M', value: 'M'}, 
          {name: 'L', value: 'L'}, 
          {name: 'XL', value: 'XL', extraPrice: 5},
          {name: 'XXL', value: 'XXL', extraPrice: 10}
        ] 
      }
    ]
  },
  [Category.BEDDING]: {
    id: Category.BEDDING,
    name: '床品',
    icon: '🛏️',
    basePrice: 599.0,
    baseLeadTime: 7,
    description: '60支长绒棉，五星级酒店肤感',
    aspectRatio: '1:1',
    options: [
      { 
        label: '面料', 
        key: 'fabric', 
        type: 'select', 
        values: [
          {name: '长绒棉', value: 'cotton'}, 
          {name: '真丝缎面', value: 'silk', extraPrice: 300, extraLeadTime: 5}
        ] 
      },
      { 
        label: '规格', 
        key: 'spec', 
        type: 'size', 
        values: [
          {name: '1.5m三件套', value: '1.5'}, 
          {name: '1.8m四件套', value: '1.8', extraPrice: 150, extraLeadTime: 1}
        ] 
      }
    ]
  }
};

export const DESIGN_STYLES: DesignStyle[] = [
  { id: 'minimal', name: '极简主义', promptSuffix: 'Modern minimalist scandinavian style, clean lines, high-end white background flat vector art' },
  { id: 'cyber', name: '赛博朋克', promptSuffix: 'Cyberpunk aesthetic, neon high-contrast, futuristic glitch textures, digital noir' },
  { id: 'y2k', name: 'Y2K时尚', promptSuffix: 'Y2K retro-futurism, 2000s glossy plastic aesthetic, chrome accents, bright pop colors' },
  { id: 'guochao', name: '潮牌国风', promptSuffix: 'Modern Chinese street culture style, "Guochao" aesthetic, traditional ink-wash meets hip-hop graphic art' },
  { id: 'gorpcore', name: '山系户外', promptSuffix: 'Gorpcore outdoor aesthetic, topographic patterns, earthy nature tones, tech-wear texture' },
  { id: 'clay', name: '3D立体', promptSuffix: '3D isometric clay render, C4D style, soft rounded volumes, professional product photography lighting' }
];

export const INITIAL_POINTS = 1000;
export const REFERRAL_BONUS_POINTS = 500; // 邀请/被邀请额外奖励
export const GENERATION_COST = 10;
export const ROYALTY_GOLD = 50; 
export const GOLD_TO_CNY_RATE = 10;
