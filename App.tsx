
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Category, UserWork, Order, UserProfile, DesignStyle, CartItem } from './types';
import { CATEGORIES, DESIGN_STYLES, INITIAL_POINTS, GENERATION_COST, REFERRAL_BONUS_POINTS, ROYALTY_GOLD } from './constants';
import { generateDesignPair, refreshMockup } from './geminiService';

// --- 模拟进度条组件 ---
const SimulatedProgressBar: React.FC<{ isLoading: boolean; type?: 'full' | 'inline' }> = ({ isLoading, type = 'full' }) => {
  const [progress, setProgress] = useState(0);
  const [messageIdx, setMessageIdx] = useState(0);
  const timerRef = useRef<number | null>(null);
  const msgTimerRef = useRef<number | null>(null);

  const messages = ["正在调动 AI 灵感...", "正在构思设计构图...", "正在渲染高像素纹理...", "正在优化光影细节...", "正在同步实景预览...", "即将展现您的创意..."];

  useEffect(() => {
    if (isLoading) {
      setProgress(0);
      setMessageIdx(0);
      timerRef.current = window.setInterval(() => {
        setProgress(prev => {
          if (prev < 30) return prev + Math.random() * 5;
          if (prev < 70) return prev + Math.random() * 2;
          if (prev < 95) return prev + Math.random() * 0.5;
          return prev;
        });
      }, 200);
      msgTimerRef.current = window.setInterval(() => {
        setMessageIdx(prev => (prev + 1) % messages.length);
      }, 2500);
    } else {
      setProgress(100);
      if (timerRef.current) clearInterval(timerRef.current);
      if (msgTimerRef.current) clearInterval(msgTimerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (msgTimerRef.current) clearInterval(msgTimerRef.current);
    };
  }, [isLoading]);

  if (!isLoading && progress === 100) return null;

  return (
    <div className={type === 'full' 
      ? "fixed inset-0 z-[500] bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center p-10 animate-in fade-in duration-300"
      : "absolute inset-0 z-[60] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300"
    }>
      <div className="w-full max-w-xs space-y-4">
        <div className="flex justify-between items-end mb-1">
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest animate-pulse">{messages[messageIdx]}</span>
          <span className="text-[10px] font-black text-gray-400">{Math.floor(progress)}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[8px] text-center text-gray-300 font-bold uppercase tracking-tighter">AI 正在为您全力创作，请稍候</p>
      </div>
    </div>
  );
};

// --- 存储逻辑 ---
const STORAGE_KEY = 'DESIGN_AI_SYSTEM_STORAGE_V12';
const saveProfile = (profile: UserProfile) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch (e) { console.error("保存失败", e); }
};
const loadProfile = (): UserProfile => {
  // 修改游客初始点数为 0
  const fallback: UserProfile = { id: `GUEST-${Math.random().toString(36).substr(2, 4).toUpperCase()}`, nickname: '游客', points: 0, gold: 0, works: [], orders: [], cart: [], referralCode: `NICE-${Math.random().toString(36).substr(2, 4).toUpperCase()}`, inviteCount: 0 };
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return fallback;
  try { return JSON.parse(saved); } catch (e) { return fallback; }
};

// --- 购物车侧边栏 ---
const CartDrawer: React.FC<{ items: CartItem[]; isOpen: boolean; onClose: () => void; onOrder: (item: CartItem) => void; onRemove: (id: string) => void; onZoom: (url: string) => void; }> = ({ items, isOpen, onClose, onOrder, onRemove, onZoom }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[44px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-500" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-8 pb-4 border-b border-gray-50"><h2 className="text-2xl font-black text-gray-800 italic uppercase">购物车</h2><button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 text-xl font-bold">×</button></div>
        <div className="flex-1 overflow-y-auto p-8 pt-4 pb-24">
          {items.length === 0 ? (<div className="py-24 flex flex-col items-center justify-center opacity-20"><span className="text-6xl">🛒</span><p className="font-black mt-4 text-gray-400 uppercase">购物车空空如也</p></div>) : (
            <div className="space-y-6">{items.map(item => (
              <div key={item.id} className="bg-gray-50 rounded-[36px] p-5 flex gap-5 border border-gray-100 items-center">
                <img onClick={() => onZoom(item.mockupUrl)} src={item.mockupUrl} className="w-20 h-20 rounded-2xl object-cover border border-white shadow-sm shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-gray-800 text-sm truncate uppercase tracking-tight">{CATEGORIES[item.work.category]?.name}</h4>
                  <p className="text-indigo-600 font-black text-base">¥{item.price}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0"><button onClick={() => onOrder(item)} className="w-11 h-11 bg-black text-white rounded-2xl flex items-center justify-center active:scale-95">📦</button><button onClick={() => onRemove(item.id)} className="w-11 h-11 bg-white text-red-400 border border-red-100 rounded-2xl flex items-center justify-center active:scale-95 transition-all">🗑️</button></div>
              </div>
            ))}</div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 用户中心模态框 ---
const UserCenterModal: React.FC<{ 
  profile: UserProfile; 
  isOpen: boolean; 
  onClose: () => void;
  onUpdateName: (name: string) => void;
  onLogin: (referralCode?: string) => void;
}> = ({ profile, isOpen, onClose, onUpdateName, onLogin }) => {
  const [editing, setEditing] = useState(false);
  const [tempName, setTempName] = useState(profile.nickname);
  const [inputReferral, setInputReferral] = useState('');
  if (!isOpen) return null;
  const isGuest = profile.id.startsWith('GUEST');
  const copyCode = () => { navigator.clipboard.writeText(profile.referralCode); alert('邀请码已复制：' + profile.referralCode); };
  
  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-300" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-8" />
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 p-1 shadow-2xl mb-4"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`} className="w-full h-full rounded-full bg-white border-2 border-white object-cover" /></div>
          <div className="flex items-center gap-2 group">{editing ? <input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} onBlur={() => { setEditing(false); onUpdateName(tempName); }} className="text-2xl font-black text-center border-b-2 border-indigo-600 outline-none w-40" /> : <h3 className="text-2xl font-black text-gray-800 tracking-tight italic">{profile.nickname}</h3>}<button onClick={() => setEditing(true)} className="text-gray-300 group-hover:text-indigo-400 transition-colors">✎</button></div>
          <p className="text-[10px] font-black text-gray-400 mt-2 tracking-widest uppercase">{isGuest ? '游客预览中' : `用户 ID: ${profile.id}`}</p>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-amber-50 rounded-3xl p-5 border border-amber-100"><p className="text-[9px] font-black text-amber-500 uppercase mb-1">金币余额</p><p className="text-xl font-black text-amber-600 tracking-tighter">🪙 {profile.gold}</p></div>
            <div className="bg-indigo-50 rounded-3xl p-5 border border-indigo-100"><p className="text-[9px] font-black text-indigo-500 uppercase mb-1">可用点数</p><p className="text-xl font-black text-indigo-600 tracking-tighter">⚡ {profile.points}</p></div>
          </div>
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden group">
            <div className="relative z-10 flex justify-between items-center">
              <div><h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">邀请奖励</h4><p className="text-xl font-black italic">每位成功邀请 +{REFERRAL_BONUS_POINTS} ⚡</p></div>
              <div className="text-right"><p className="text-[10px] font-bold text-indigo-200 uppercase mb-1">我的邀请码</p><button onClick={copyCode} className="bg-white/20 px-3 py-1.5 rounded-xl text-xs font-black tracking-widest">{profile.referralCode} 📋</button></div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-[32px] p-6 space-y-4 border border-gray-100">
            <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest">快捷登录</h4>
            <input type="tel" placeholder="请输入手机号" className="w-full h-14 bg-white rounded-2xl px-6 text-sm shadow-sm outline-none" />
            {isGuest && <input type="text" placeholder="推荐人邀请码 (可选)" value={inputReferral} onChange={(e) => setInputReferral(e.target.value)} className="w-full h-14 bg-indigo-50/50 rounded-2xl px-6 text-sm border-2 border-dashed border-indigo-100 outline-none" />}
            <button onClick={() => onLogin(inputReferral)} className="w-full h-14 bg-black text-white rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 transition-all mt-2">{isGuest ? '立即登录' : '刷新身份'}</button>
          </div>
        </div>
        <button onClick={onClose} className="w-full mt-10 py-4 text-gray-400 font-black text-[10px] uppercase">关闭</button>
      </div>
    </div>
  );
};

// --- 引用确认对话框 ---
const QuoteConfirmModal: React.FC<{
  work: UserWork | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (saveToLibrary: boolean) => void;
}> = ({ work, isOpen, onClose, onConfirm }) => {
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  if (!isOpen || !work) return null;

  return (
    <div className="fixed inset-0 z-[450] bg-black/60 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-300" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
        <h3 className="text-xl font-black text-gray-800 mb-2 uppercase italic tracking-tight">确认引用设计 / Quote</h3>
        <p className="text-xs text-gray-400 mb-8 leading-relaxed">您正在引用来自 <span className="text-indigo-600 font-bold">{work.author}</span> 的创意作品。您可以直接配置规格，或将其存入您的私人库。</p>
        
        <div className="bg-gray-50 rounded-[32px] p-6 mb-8 flex items-center justify-between border border-gray-100 cursor-pointer active:scale-95 transition-all" onClick={() => setSaveToLibrary(!saveToLibrary)}>
          <div className="flex items-center gap-4">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${saveToLibrary ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-200'}`}>
              {saveToLibrary && <span className="text-white text-[10px] font-bold">✓</span>}
            </div>
            <div>
              <p className="text-sm font-black text-gray-800">同时保存到“我的资产库”</p>
              <p className="text-[10px] text-gray-400">方便后续随时管理与再次使用</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 h-14 bg-gray-50 text-gray-400 rounded-2xl font-black text-xs uppercase">取消</button>
          <button onClick={() => onConfirm(saveToLibrary)} className="flex-[2] h-14 bg-black text-white rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95">确定引用 →</button>
        </div>
        <div className="h-10" />
      </div>
    </div>
  );
};

// --- 全局导航 ---
const NavBar: React.FC<{ active: string; onChange: (v: string) => void }> = ({ active, onChange }) => (
  <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/80 backdrop-blur-2xl border border-white/40 rounded-[40px] flex justify-around items-center py-3 px-4 shadow-2xl z-[50]">
    {[ { id: 'design', icon: '✨', label: '创作' }, { id: 'custom', icon: '📐', label: '规格' }, { id: 'gallery', icon: '🖼️', label: '灵感' }, { id: 'orders', icon: '📦', label: '订单' } ].map(item => (
      <button key={item.id} onClick={() => onChange(item.id)} className={`flex flex-col items-center justify-center transition-all w-14 h-14 rounded-full ${active === item.id ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-gray-300 hover:text-gray-400'}`}>
        <span className="text-xl">{item.icon}</span>
        <span className={`text-[8px] font-bold mt-0.5 ${active === item.id ? 'text-white' : 'text-gray-400'}`}>{item.label}</span>
      </button>
    ))}
  </div>
);

const ImageModal: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => (
  <div className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200 cursor-zoom-out" onClick={onClose}>
    <img src={url} className="max-w-full max-h-full object-contain shadow-2xl rounded-2xl" onClick={(e) => e.stopPropagation()} />
  </div>
);

// --- 灵感页 ---
const GalleryPage: React.FC<{ profile: UserProfile; onSelect: (w: UserWork) => void; onDelete: (id: string) => void; onTogglePublic: (id: string) => void; onLike: (id: string) => void; onZoom: (url: string) => void; }> = ({ profile, onSelect, onDelete, onTogglePublic, onLike, onZoom }) => {
  const [activeSubTab, setActiveSubTab] = useState<'my' | 'public'>('my');
  const publicWorks = useMemo(() => (profile.works || []).filter(w => w.isPublic), [profile.works]);
  
  return (<div className="p-4 pb-48 animate-in fade-in duration-500">
    <div className="flex items-center gap-8 mb-8 px-4 border-b border-gray-100"><button onClick={() => setActiveSubTab('my')} className={`pb-3 text-lg font-black transition-all ${activeSubTab === 'my' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-300'}`}>我的资产库</button><button onClick={() => setActiveSubTab('public')} className={`pb-3 text-lg font-black transition-all ${activeSubTab === 'public' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-300'}`}>全球灵感榜</button></div>
    
    {activeSubTab === 'my' ? (<div className="grid grid-cols-2 gap-4">{(profile.works || []).map(work => (
      <div key={work.id} className="bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-sm relative">
        <div className="aspect-square bg-gray-50 flex items-center justify-center p-2" onClick={() => onZoom(work.mockupUrl)}><img src={work.mockupUrl} className="max-w-full max-h-full object-contain" /></div>
        {work.author !== profile.nickname && <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-indigo-600 text-white text-[7px] font-black rounded-full uppercase">📐 引用</div>}
        <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-gray-50 bg-gray-50/30">
          <span className="text-[8px] font-black text-gray-400">❤️ {work.likes}</span>
          <span className="text-[8px] font-black text-gray-400">📐 {work.uses}</span>
          <span className="text-[8px] font-black text-gray-400">📦 {work.orders}</span>
        </div>
        <div className="p-3 flex gap-2"><button onClick={() => onTogglePublic(work.id)} className={`flex-1 py-2 rounded-xl text-[9px] font-black border transition-all ${work.isPublic ? 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm' : 'bg-gray-50 text-gray-300 border-gray-100'}`}>{work.isPublic ? '公开中' : '去发布'}</button><button onClick={() => onDelete(work.id)} className="w-8 h-8 bg-red-50 text-red-300 rounded-xl flex items-center justify-center">🗑️</button></div>
      </div>
    ))}</div>) : (<div className="space-y-6">{publicWorks.map(work => (
      <div key={work.id} className="bg-white rounded-[40px] p-5 shadow-xl border border-gray-100 flex gap-5 items-center">
        <div className="w-24 h-24 bg-gray-50 rounded-[32px] flex items-center justify-center p-2 relative overflow-hidden group">
          <img onClick={() => onZoom(work.mockupUrl)} src={work.mockupUrl} className="max-w-full max-h-full object-contain transition-transform group-hover:scale-110" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-black text-gray-800 text-sm uppercase truncate">{CATEGORIES[work.category]?.name}</h4>
          <p className="text-[9px] text-gray-400 italic mb-2">设计师: {work.author}</p>
          <div className="flex items-center gap-3">
            <button onClick={() => onLike(work.id)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-red-50 text-red-500 text-[9px] font-black border border-red-100 active:scale-90 transition-all">❤️ {work.likes || 0}</button>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-indigo-300 uppercase">📐 {work.uses || 0}</span>
              <span className="text-[9px] font-black text-amber-300 uppercase">📦 {work.orders || 0}</span>
            </div>
          </div>
        </div>
        <button onClick={() => onSelect(work)} className="w-14 h-14 bg-black text-white rounded-[24px] flex flex-col items-center justify-center active:scale-95 transition-all shadow-lg">
          <span className="text-xl">📐</span>
          <span className="text-[7px] font-black mt-0.5">引用</span>
        </button>
      </div>
    ))}</div>)}
  </div>);
};

// --- 订单进度页 ---
const OrderProgressPage: React.FC<{ orders: Order[]; onZoom: (url: string) => void; }> = ({ orders, onZoom }) => (<div className="p-4 pb-48 animate-in fade-in duration-500"><h1 className="text-2xl font-black mb-8 px-2 tracking-tight uppercase italic">生产队列</h1><div className="space-y-6">{orders.map(order => (
  <div key={order.id} className="bg-white rounded-[44px] p-6 shadow-xl border border-gray-50"><div className="flex gap-6 mb-6"><div className="w-24 h-24 bg-gray-50 rounded-[28px] flex items-center justify-center p-2"><img onClick={() => onZoom(order.imageUrl)} src={order.imageUrl} className="max-w-full max-h-full object-contain" /></div><div className="flex-1"><h4 className="font-black text-gray-800 text-lg">{CATEGORIES[order.category]?.name}</h4><span className="inline-block mt-4 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-tighter border border-emerald-100">正在排产</span></div></div><div className="bg-gray-50 rounded-[32px] p-6 flex justify-between items-center relative"><div className="absolute top-0 left-0 h-1 bg-emerald-400 rounded-full w-1/5" />{['审核', '制造', '质检', '配送', '签收'].map((s, i) => (<div key={s} className="flex flex-col items-center gap-2"><div className={`w-3 h-3 rounded-full border-2 ${i===0?'bg-emerald-500 border-emerald-100':'bg-white border-gray-100'}`} /><span className="text-[8px] font-black">{s}</span></div>))}</div></div>
))}</div></div>);

// --- 工作台 ---
const WorkspacePage: React.FC<{ 
  profile: UserProfile; 
  lastWork: UserWork | null;
  prompt: string;
  setPrompt: (v: string) => void;
  onGenerated: (d: UserWork) => void;
  onEnterConfig: (d: UserWork) => void;
  onZoom: (url: string) => void;
  onOpenUser: () => void;
  deductPoints: () => void;
}> = ({ profile, lastWork, prompt, setPrompt, onGenerated, onEnterConfig, onZoom, onOpenUser, deductPoints }) => {
  const [selectedCat, setSelectedCat] = useState<Category>(Category.MOUSEPAD);
  const [selectedStyle, setSelectedStyle] = useState<DesignStyle>(DESIGN_STYLES[0]);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (images.length + files.length > 5) { alert("最多参考 5 张图"); return; }
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setImages(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => { setImages(prev => prev.filter((_, i) => i !== index)); };

  const handleGenerate = async () => {
    if (profile.id.startsWith('GUEST') || profile.points < GENERATION_COST) { onOpenUser(); return; }
    if (!prompt.trim()) { alert("描述一下您的灵感吧"); return; }
    setLoading(true);
    try {
      const { designUrl, mockupUrl } = await generateDesignPair(prompt, selectedCat, selectedStyle.promptSuffix, images);
      onGenerated({ id: Math.random().toString(36).substr(2, 9), imageUrl: designUrl, mockupUrl, category: selectedCat, prompt, isPublic: false, likes: 0, uses: 0, orders: 0, author: profile.nickname, createdAt: Date.now() });
      deductPoints();
    } catch (e) { alert("创作引擎繁忙，请重试"); } finally { setLoading(false); }
  };

  return (
    <div className="p-4 pb-48 animate-in fade-in duration-500">
      <SimulatedProgressBar isLoading={loading} />
      <header className="flex items-center justify-between mb-8 px-2 pt-4">
        <div><h1 className="text-2xl font-black text-indigo-600 tracking-tighter uppercase italic">NICE AI</h1><p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mt-1">万物生于您的想象</p></div>
        <div className="flex items-center gap-2"><div className="flex flex-col items-end gap-1"><span className="text-[9px] font-black bg-amber-50 px-2 py-0.5 rounded-full text-amber-600 border border-amber-100">🪙 {profile.gold}</span><span className="text-[9px] font-black bg-indigo-50 px-2 py-0.5 rounded-full text-indigo-500 border border-indigo-100">⚡ {profile.points}</span></div><button onClick={onOpenUser} className="w-9 h-9 rounded-full border border-gray-100 shadow-sm overflow-hidden active:scale-90 transition-all"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`} className="w-full h-full object-cover" /></button></div>
      </header>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="flex flex-col gap-3"><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic px-2">工业设计稿</p><div className="aspect-square bg-gray-50 rounded-[24px] overflow-hidden border border-gray-100 shadow-lg relative flex items-center justify-center p-2 cursor-zoom-in" onClick={() => lastWork?.imageUrl && onZoom(lastWork.imageUrl)}>{lastWork?.imageUrl ? <img src={lastWork.imageUrl} className="max-w-full max-h-full object-contain" /> : <div className="text-[9px] font-black text-gray-200">等待创作...</div>}</div></div>
        <div className="flex flex-col gap-3"><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic px-2">实景展示看板</p><div className="aspect-square bg-gray-50 rounded-[24px] overflow-hidden border border-gray-100 shadow-lg relative flex items-center justify-center p-2 cursor-zoom-in" onClick={() => lastWork?.mockupUrl && onZoom(lastWork.mockupUrl)}>{lastWork?.mockupUrl ? <img src={lastWork.mockupUrl} className="max-w-full max-h-full object-contain" /> : <div className="text-[9px] font-black text-gray-200">等待创作...</div>}{lastWork?.mockupUrl && <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/10 backdrop-blur-md rounded text-[7px] font-black text-white/40">三段式多视图</div>}</div></div>
      </div>
      <div className="bg-white rounded-[40px] p-4 shadow-2xl border border-gray-100">
        <div className="grid grid-cols-4 gap-1.5 mb-5">{Object.values(CATEGORIES).map(cat => (<button key={cat.id} onClick={() => setSelectedCat(cat.id)} className={`py-3 rounded-[24px] flex flex-col items-center justify-center gap-1.5 transition-all border ${selectedCat === cat.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-gray-50 text-gray-400 border-transparent'}`}><span className="text-base">{cat.icon}</span><span className="text-[10px] font-black uppercase tracking-tighter">{cat.name}</span></button>))}</div>
        <div className="grid grid-cols-3 gap-1.5 mb-5">{DESIGN_STYLES.map(style => (<button key={style.id} onClick={() => setSelectedStyle(style)} className={`py-2 rounded-xl text-[10px] font-black border transition-all ${selectedStyle.id === style.id ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm' : 'bg-white border-gray-100 text-gray-300'}`}>{style.name}</button>))}</div>
        {images.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto py-2 px-1 hide-scrollbar bg-gray-50/50 rounded-2xl">
            {images.map((img, idx) => (
              <div key={idx} className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 border-white shadow-md animate-in zoom-in-75">
                <img src={img} className="w-full h-full object-cover" />
                <button onClick={() => removeImage(idx)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 text-white rounded-full flex items-center justify-center text-[8px] font-bold">×</button>
              </div>
            ))}
            {images.length < 5 && <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 shrink-0 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">+</button>}
          </div>
        )}
        <div className="relative">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="描述您的设计灵感，或上传参考图进行创作..." className="w-full bg-gray-50 rounded-[28px] p-5 pb-14 text-xs border-none focus:ring-2 focus:ring-indigo-100 min-h-[120px] resize-none" />
          <div className="absolute bottom-3 left-4 flex gap-2"><input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} /><button onClick={() => fileInputRef.current?.click()} className="w-11 h-11 rounded-full bg-white border border-gray-100 text-indigo-600 flex items-center justify-center shadow-sm relative"><span className="text-xl">🖼️</span>{images.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">{images.length}</span>}</button>{images.length > 0 && <button onClick={() => { setImages([]); setPrompt(''); }} className="px-3 py-1 text-[9px] font-black text-red-400 bg-red-50 rounded-full border border-red-100 active:scale-95">清空</button>}</div>
          <button onClick={handleGenerate} disabled={loading || !prompt} className="absolute bottom-3 right-3 w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xl active:scale-90 disabled:opacity-30">{loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "🚀"}</button>
        </div>
        <button onClick={() => lastWork && onEnterConfig(lastWork)} disabled={!lastWork} className="w-full mt-4 py-4 bg-black text-white rounded-[24px] font-black text-sm uppercase tracking-widest active:scale-95 disabled:opacity-20 shadow-xl transition-all">进入规格配置模式 →</button>
      </div>
    </div>
  );
};

// --- 配置页 ---
const ConfigPage: React.FC<{ work: UserWork; onOrder: (order: Order) => void; onAddToCart: (item: Omit<CartItem, 'id' | 'addedAt'>) => void; cartCount: number; onOpenCart: () => void; onBack: () => void; onZoom: (url: string) => void; }> = ({ work, onOrder, onAddToCart, cartCount, onOpenCart, onBack, onZoom }) => {
  const catInfo = CATEGORIES[work.category];
  const [specs, setSpecs] = useState<Record<string, string>>(() => { const initial: Record<string, string> = {}; catInfo.options.forEach(opt => initial[opt.key] = opt.values[0].value); return initial; });
  const [mockupUrl, setMockupUrl] = useState(work.mockupUrl);
  const [refreshing, setRefreshing] = useState(false);
  const stats = useMemo(() => {
    let price = catInfo.basePrice;
    let leadTime = catInfo.baseLeadTime;
    catInfo.options.forEach(opt => { const selected = opt.values.find(v => v.value === specs[opt.key]); if (selected?.extraPrice) price += selected.extraPrice; if (selected?.extraLeadTime) leadTime += selected.extraLeadTime; });
    return { price, leadTime };
  }, [specs, catInfo]);
  const handleUpdatePreview = async () => {
    setRefreshing(true);
    const specDescs = Object.entries(specs).map(([k, v]) => `【${k}】: ${v}`).join('; ');
    const newMockup = await refreshMockup(work.imageUrl.split(',')[1], work.category, specDescs, mockupUrl.split(',')[1]);
    if (newMockup) setMockupUrl(newMockup);
    setRefreshing(false);
  };
  return (<div className="h-screen bg-white flex flex-col overflow-hidden"><div className="p-4 flex items-center justify-between border-b border-gray-50"><button onClick={onBack} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-full">←</button><h2 className="font-black text-lg text-gray-800 uppercase italic">规格配置 / Specs</h2><div className="flex gap-2"><button onClick={onOpenCart} className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center relative active:scale-90 transition-all"><span className="text-xl">🛒</span>{cartCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">{cartCount}</span>}</button><button onClick={handleUpdatePreview} disabled={refreshing} className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center active:rotate-180 transition-transform">{refreshing ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> : '📸'}</button></div></div><div className="flex-1 overflow-y-auto pb-48 relative"><SimulatedProgressBar isLoading={refreshing} type="inline" /><div className="aspect-square mx-auto bg-gray-50 flex items-center justify-center p-4 cursor-zoom-in" onClick={() => !refreshing && onZoom(mockupUrl)}><img src={mockupUrl} className="max-w-full max-h-full object-contain shadow-sm" /></div><div className="p-8 space-y-12">{catInfo.options.map(opt => (<div key={opt.key}><label className="text-[10px] font-black text-indigo-300 uppercase mb-4 block">{opt.label}</label><div className="grid grid-cols-2 gap-3">{opt.values.map(val => (<button key={val.value} onClick={() => setSpecs(prev => ({ ...prev, [opt.key]: val.value }))} className={`p-4 rounded-[24px] text-[11px] font-black border transition-all text-left flex justify-between items-center ${specs[opt.key] === val.value ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : 'bg-white text-gray-400 border-gray-100'}`}><span>{val.name}</span> <span className="text-[9px] opacity-60">{val.extraPrice ? `+¥${val.extraPrice}` : ''}</span></button>))}</div></div>))}</div></div><div className="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-gray-100 p-6 space-y-4 shadow-2xl max-w-md mx-auto z-[60]"><div className="flex justify-between items-end"><div><p className="text-[9px] font-bold text-gray-400 uppercase">预计总额</p><p className="text-3xl font-black text-indigo-600">¥{stats.price}</p></div><div className="text-right"><p className="text-[9px] font-bold text-indigo-300 uppercase">工期</p><p className="text-sm font-black text-gray-800 uppercase italic">{stats.leadTime} DAYS</p></div></div><div className="flex gap-4"><button onClick={() => onAddToCart({ work, specs, price: stats.price, leadTime: stats.leadTime, mockupUrl })} className="flex-1 h-14 bg-amber-50 text-amber-600 rounded-[20px] font-black text-xs uppercase border border-amber-100 active:scale-95 transition-all">存入购物车</button><button onClick={() => onOrder({ id: '', workId: work.id, category: work.category, imageUrl: mockupUrl, specs, price: stats.price, leadTime: stats.leadTime, status: 'PENDING', qaRecords: [], createdAt: Date.now() })} className="flex-[2] h-14 bg-black text-white rounded-[20px] font-black text-xs uppercase shadow-xl active:scale-95 transition-all">确认下单 →</button></div></div></div>);
};

// --- 主应用 ---
const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('design');
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [lastWork, setLastWork] = useState<UserWork | null>(null);
  const [configuringWork, setConfiguringWork] = useState<UserWork | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  
  // 引用相关的临时状态
  const [pendingQuoteWork, setPendingQuoteWork] = useState<UserWork | null>(null);

  useEffect(() => { saveProfile(profile); }, [profile]);

  const handleGenerated = (work: UserWork) => { setProfile(p => ({ ...p, works: [work, ...(p.works || [])] })); setLastWork(work); };
  
  const handleOrder = (order: Order) => { 
    const finalOrder = { ...order, id: `C2M-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, createdAt: Date.now() }; 
    setProfile(p => {
      // 检查是否为引用设计，若是则奖励原作者
      const updatedWorks = [...(p.works || [])].map(w => {
        if (w.id === order.workId) return { ...w, orders: (w.orders || 0) + 1 };
        return w;
      });
      return { ...p, orders: [finalOrder, ...(p.orders || [])], works: updatedWorks, gold: p.gold + (p.id === 'OFFICIAL' ? 0 : 5) };
    }); 
    setIsCartOpen(false); 
    setActiveTab('orders'); 
  };

  const handleLogin = (ref: string) => {
    if (!profile.id.startsWith('GUEST')) { alert("您已登录"); return; }
    const hasReferral = ref && ref.trim().length > 0;
    setProfile(p => ({ 
      ...p, 
      id: `USER-${Math.random().toString(36).substr(2, 6).toUpperCase()}`, 
      nickname: p.nickname === '游客' ? '灵感家' : p.nickname,
      points: p.points + 1000 + (hasReferral ? REFERRAL_BONUS_POINTS : 0)
    })); 
    setIsUserModalOpen(false);
    alert("登录成功！获得新人礼包 1000⚡");
  };

  const handleQuoteConfirm = (saveToLibrary: boolean) => {
    if (!pendingQuoteWork) return;
    const work = pendingQuoteWork;
    
    setProfile(p => {
      // 增加全站引用计数
      const updatedAllWorks = p.works.map(w => w.id === work.id ? { ...w, uses: (w.uses || 0) + 1 } : w);
      
      let nextWorks = updatedAllWorks;
      // 如果选择保存到资产库，则创建副本
      if (saveToLibrary) {
        const alreadyExists = p.works.some(w => w.imageUrl === work.imageUrl && w.author === work.author && w.id.startsWith('QUOTED-'));
        if (!alreadyExists) {
          const quotedWork: UserWork = {
            ...work,
            id: `QUOTED-${Math.random().toString(36).substr(2, 6)}`,
            createdAt: Date.now()
          };
          nextWorks = [quotedWork, ...nextWorks];
        }
      }
      return { ...p, works: nextWorks };
    });

    setPrompt(work.prompt);
    setConfiguringWork(work);
    setPendingQuoteWork(null);
    setActiveTab('custom');
    if (saveToLibrary) {
      alert("已成功添加至‘我的资产库’");
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto relative bg-white text-gray-900 flex flex-col">
      <div className="flex-1">
        {activeTab === 'design' && <WorkspacePage profile={profile} lastWork={lastWork} prompt={prompt} setPrompt={setPrompt} onGenerated={handleGenerated} deductPoints={() => setProfile(p => ({ ...p, points: (p.points || 0) - GENERATION_COST }))} onZoom={setZoomedImage} onOpenUser={() => setIsUserModalOpen(true)} onEnterConfig={(w) => { setConfiguringWork(w); setActiveTab('custom'); }} />}
        {activeTab === 'custom' && configuringWork && <ConfigPage work={configuringWork} onOrder={handleOrder} onAddToCart={(item) => setProfile(p => ({ ...p, cart: [{ ...item, id: Math.random().toString(36).substr(2, 9), addedAt: Date.now() }, ...(p.cart || [])] }))} cartCount={profile?.cart?.length || 0} onOpenCart={() => setIsCartOpen(true)} onBack={() => setActiveTab('design')} onZoom={setZoomedImage} />}
        {activeTab === 'gallery' && <GalleryPage profile={profile} onSelect={(w) => setPendingQuoteWork(w)} onDelete={(id) => setProfile(p => ({...p, works: p.works.filter(w=>w.id!==id)}))} onTogglePublic={(id) => setProfile(p => ({...p, works: p.works.map(w=>w.id===id?{...w,isPublic:!w.isPublic}:w)}))} onLike={(id) => setProfile(p=>({...p,works:p.works.map(w=>w.id===id?{...w,likes:w.likes+1}:w)}))} onZoom={setZoomedImage} />}
        {activeTab === 'orders' && <OrderProgressPage orders={profile.orders || []} onZoom={setZoomedImage} />}
      </div>
      {activeTab !== 'custom' && <NavBar active={activeTab} onChange={(id) => { if(id === 'custom' && !configuringWork && lastWork) setConfiguringWork(lastWork); setActiveTab(id); }} />}
      <CartDrawer items={profile.cart || []} isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onZoom={setZoomedImage} onRemove={(id) => setProfile(p => ({ ...p, cart: p.cart.filter(c => c.id !== id) }))} onOrder={(item) => handleOrder({ id: '', workId: item.work.id, category: item.work.category, imageUrl: item.mockupUrl, specs: item.specs, price: item.price, leadTime: item.leadTime, status: 'PENDING', qaRecords: [], createdAt: Date.now() })} />
      <UserCenterModal profile={profile} isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} onUpdateName={(name) => setProfile(p => ({ ...p, nickname: name }))} onLogin={handleLogin} />
      <QuoteConfirmModal work={pendingQuoteWork} isOpen={!!pendingQuoteWork} onClose={() => setPendingQuoteWork(null)} onConfirm={handleQuoteConfirm} />
      {zoomedImage && <ImageModal url={zoomedImage} onClose={() => setZoomedImage(null)} />}
    </div>
  );
};

export default App;
