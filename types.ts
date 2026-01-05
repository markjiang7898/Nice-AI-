
export enum Category {
  MOUSEPAD = 'MOUSEPAD',
  PHONE_CASE = 'PHONE_CASE',
  TSHIRT = 'TSHIRT',
  BEDDING = 'BEDDING'
}

export interface DesignStyle {
  id: string;
  name: string;
  promptSuffix: string;
}

export interface CategoryInfo {
  id: Category;
  name: string;
  icon: string;
  basePrice: number;
  baseLeadTime: number; // 基础加工时长（天）
  description: string;
  aspectRatio: string;
  options: CustomOption[];
}

export interface CustomOption {
  label: string;
  key: string;
  type: 'color' | 'select' | 'size' | 'fabric';
  values: { name: string; value: string; extraPrice?: number; extraLeadTime?: number; desc?: string }[];
}

export interface UserWork {
  id: string;
  imageUrl: string;
  mockupUrl: string;
  category: Category;
  prompt: string;
  isPublic: boolean;
  likes: number;
  uses: number; 
  orders: number; 
  author: string;
  createdAt: number;
}

export interface CartItem {
  id: string;
  work: UserWork;
  specs: Record<string, string>;
  price: number;
  leadTime: number; // 保存时的预计时长
  mockupUrl: string;
  addedAt: number;
}

export interface Order {
  id: string;
  workId: string;
  category: Category;
  imageUrl: string;
  status: 'PENDING' | 'PRODUCING' | 'QA' | 'SHIPPING' | 'COMPLETED';
  specs: Record<string, string>;
  price: number;
  leadTime: number;
  qaRecords: string[];
  trackingNumber?: string;
  createdAt: number;
}

export interface UserProfile {
  id: string;
  nickname: string;
  points: number;
  gold: number;
  works: UserWork[];
  orders: Order[];
  cart: CartItem[];
  referralCode: string; // 用户自己的邀请码
  inviteCount: number;  // 成功邀请人数
}
