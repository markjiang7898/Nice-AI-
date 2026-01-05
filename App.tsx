
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Category, UserWork, Order, UserProfile, DesignStyle, CartItem } from './types';
import { CATEGORIES, DESIGN_STYLES, INITIAL_POINTS, GENERATION_COST, REFERRAL_BONUS_POINTS } from './constants';
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
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[8px] text-center text-gray-300 font-bold uppercase tracking-tighter">Please wait while AI brings your vision to life</p>
      </div>
    </div>
  );
};

// --- 存储版本 V9 ---
const STORAGE_KEY = 'DESIGN_AI_SYSTEM_STORAGE_V9';

const saveProfile = (profile: UserProfile) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error("保存失败", e);
  }
};

const loadProfile = (): UserProfile => {
  const fallback: UserProfile = { 
    id: `GUEST-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    nickname: '游客',
    points: 0, 
    gold: 0, 
    works: [], 
    orders: [], 
    cart: [],
    referralCode: '',
    inviteCount: 0
  };
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return fallback;
  try {
    const data = JSON.parse(saved);
    return {
      ...fallback,
      ...data,
      points: Number(data.points) ?? 0,
      referralCode: data.referralCode || `NICE-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    };
  } catch (e) { return fallback; }
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

  const copyCode = () => {
    navigator.clipboard.writeText(profile.referralCode);
    alert('邀请码已复制：' + profile.referralCode);
  };
  
  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-end justify-center animate-in fade-in duration-300" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-[48px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500 max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-8" />
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 p-1 shadow-2xl mb-4">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`} alt="avatar" className="w-full h-full rounded-full bg-white border-2 border-white object-cover" />
          </div>
          <div className="flex items-center gap-2 group">
            {editing ? (
              <input autoFocus value={tempName} onChange={e => setTempName(e.target.value)} onBlur={() => { setEditing(false); onUpdateName(tempName); }} className="text-2xl font-black text-center border-b-2 border-indigo-600 outline-none w-40" />
            ) : (
              <h3 className="text-2xl font-black text-gray-800 tracking-tight italic">{profile.nickname}</h3>
            )}
            <button onClick={() => setEditing(true)} className="text-gray-300 group-hover:text-indigo-400 transition-colors">✎</button>
          </div>
          <p className="text-[10px] font-black text-gray-400 mt-2 tracking-widest uppercase">{isGuest ? '游客预览中' : `USER ID: ${profile.id}`}</p>
        </div>

        <div className="space-y-6">
          {!isGuest && (
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
              <div className="relative z-10 flex justify-between items-center">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">邀请好友奖励 / Invite</h4>
                  <p className="text-xl font-black italic">每人 +{REFERRAL_BONUS_POINTS} ⚡</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-indigo-200 uppercase mb-1">我的邀请码</p>
                  <button onClick={copyCode} className="bg-white/20 px-3 py-1.5 rounded-xl text-xs font-black tracking-widest flex items-center gap-2 active:scale-95 transition-all">
                    {profile.referralCode} 📋
                  </button>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                <p className="text-[10px] font-bold text-indigo-100">已成功邀请: {profile.inviteCount} 人</p>
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => <div key={i} className="w-5 h-5 rounded-full border border-indigo-500 bg-indigo-400 overflow-hidden"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=invite-${i}`} /></div>)}
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-[32px] p-6 space-y-4 border border-gray-100">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest">快捷注册 / 登录</h4>
              {isGuest && <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-black animate-bounce">🎁 注册领1000点</span>}
            </div>
            <div className="space-y-3">
              <input type="tel" placeholder="请输入手机号" className="w-full h-14 bg-white rounded-2xl px-6 text-sm border-none focus:ring-2 focus:ring-indigo-100 shadow-sm" />
              <div className="flex gap-3">
                <input type="text" placeholder="验证码" className="flex-1 h-14 bg-white rounded-2xl px-6 text-sm border-none focus:ring-2 focus:ring-indigo-100 shadow-sm" />
                <button className="px-5 h-14 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase whitespace-nowrap active:scale-95 transition-all">获取验证码</button>
              </div>
              {isGuest && (
                <div className="pt-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 pl-1">填写邀请码（额外 +500⚡）</p>
                  <input 
                    type="text" 
                    placeholder="推荐人邀请码 (可选)" 
                    value={inputReferral}
                    onChange={(e) => setInputReferral(e.target.value)}
                    className="w-full h-14 bg-indigo-50/50 rounded-2xl px-6 text-sm border-2 border-dashed border-indigo-100 focus:border-indigo-300 outline-none shadow-sm placeholder:text-indigo-200" 
                  />
                </div>
              )}
            </div>
            <button onClick={() => onLogin(inputReferral)} className="w-full h-14 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all mt-2">立即登录</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-amber-50 rounded-3xl p-5 border border-amber-100"><p className="text-[9px] font-black text-amber-500 uppercase mb-1">金币余额</p><p className="text-xl font-black text-amber-600 tracking-tighter">🪙 {profile.gold}</p></div>
            <div className="bg-indigo-50 rounded-3xl p-5 border border-indigo-100"><p className="text-[9px] font-black text-indigo-500 uppercase mb-1">可用点数</p><p className="text-xl font-black text-indigo-600 tracking-tighter">⚡ {profile.points}</p></div>
          </div>
        </div>
        <button onClick={onClose} className="w-full mt-10 py-4 text-gray-400 font-black text-[10px] uppercase tracking-widest">返回主界面</button>
      </div>
    </div>
  );
};

// --- 全局悬浮导航栏 ---
const NavBar: React.FC<{ active: string; onChange: (v: string) => void }> = ({ active, onChange }) => (
  <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/80 backdrop-blur-2xl border border-white/40 rounded-[40px] flex justify-around items-center py-3 px-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] z-[50] animate-in fade-in slide-in-from-bottom-8 duration-500">
    {[ { id: 'design', icon: '✨', label: '创作' }, { id: 'custom', icon: '📐', label: '规格' }, { id: 'gallery', icon: '🖼️', label: '灵感' }, { id: 'orders', icon: '📦', label: '订单' } ].map(item => (
      <button key={item.id} onClick={() => onChange(item.id)} className={`relative flex flex-col items-center justify-center transition-all w-14 h-14 rounded-full ${active === item.id ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-gray-300 hover:text-gray-400'}`}>
        <span className="text-xl">{item.icon}</span>
        <span className={`text-[8px] font-bold mt-0.5 ${active === item.id ? 'text-white' : 'text-gray-400'}`}>{item.label}</span>
      </button>
    ))}
  </div>
);

const ImageModal: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => (
  <div className="fixed inset-0 z-[400] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200 cursor-zoom-out" onClick={onClose}>
    <img src={url} className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-2xl border border-white/10" onClick={(e) => e.stopPropagation()} />
  </div>
);

const CartDrawer: React.FC<{ items: CartItem[]; isOpen: boolean; onClose: () => void; onOrder: (item: CartItem) => void; onRemove: (id: string) => void; onZoom: (url: string) => void; }> = ({ items = [], isOpen, onClose, onOrder, onRemove, onZoom }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[44px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-500" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-8 pb-4 border-b border-gray-50 bg-white"><h2 className="text-2xl font-black text-gray-800 tracking-tight italic">我的购物车</h2><button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 text-xl font-bold">×</button></div>
        <div className="flex-1 overflow-y-auto p-8 pt-4 pb-24">
          <div className="space-y-6">
            {items.length === 0 ? (<div className="py-24 flex flex-col items-center justify-center opacity-20"><span className="text-6xl">🛒</span><p className="font-black text-center mt-4 text-gray-400 uppercase">Empty Cart</p></div>) : (
              items.map(item => {
                const catInfo = CATEGORIES[item.work.category];
                return (
                  <div key={item.id} className="bg-gray-50 rounded-[36px] p-5 flex gap-5 border border-gray-100 items-center">
                    <img onClick={() => onZoom(item.mockupUrl)} src={item.mockupUrl} className="w-20 h-20 rounded-2xl object-cover border border-white shadow-sm shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-gray-800 text-sm truncate uppercase tracking-tight">{catInfo?.name}</h4>
                      <div className="flex items-center gap-3 mt-1"><p className="text-indigo-600 font-black text-base">¥{item.price}</p><p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">⏳ 加工: {item.leadTime}天</p></div>
                      <div className="flex flex-wrap gap-1 mt-2">{Object.entries(item.specs).map(([key, val]) => { const opt = catInfo?.options.find(o => o.key === key); const valInfo = opt?.values.find(v => v.value === val); return (<span key={key} className="text-[8px] bg-white px-1.5 py-0.5 rounded border border-gray-200 font-bold text-gray-400 uppercase shrink-0">{opt?.label}: {valInfo?.name || val}</span>); })}</div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0"><button onClick={() => onOrder(item)} className="w-11 h-11 bg-black text-white rounded-2xl flex items-center justify-center active:scale-95 transition-all">📦</button><button onClick={() => onRemove(item.id)} className="w-11 h-11 bg-white text-red-400 border border-red-100 rounded-2xl flex items-center justify-center active:scale-95 transition-all">🗑️</button></div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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

  // Fix handleImageUpload: casting e.target.files to File[] to prevent 'unknown' to 'Blob' error during reader.readAsDataURL(file)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (images.length + files.length > 5) {
      alert("单次创作最多参考 5 张图片");
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (profile.id.startsWith('GUEST') || profile.points < GENERATION_COST) { onOpenUser(); return; }
    if (!prompt.trim()) { alert("请描述您的设计构思"); return; }
    setLoading(true);
    try {
      const { designUrl, mockupUrl } = await generateDesignPair(prompt, selectedCat, selectedStyle.promptSuffix, images);
      onGenerated({ id: Math.random().toString(36).substr(2, 9), imageUrl: designUrl, mockupUrl: mockupUrl, category: selectedCat, prompt: prompt, isPublic: false, likes: 0, uses: 0, orders: 0, author: 'Me', createdAt: Date.now() });
      deductPoints();
      setImages([]); // 生成成功后清空参考图
    } catch (e) { alert("AI 创作繁忙，请稍后再试"); } finally { setLoading(false); }
  };

  return (
    <div className="p-4 pb-48 animate-in fade-in duration-500">
      <SimulatedProgressBar isLoading={loading} />
      <header className="flex items-center justify-between mb-8 px-2 pt-4">
        <div>
          <h1 className="text-2xl font-black text-indigo-600 tracking-tighter uppercase italic leading-none">NICE AI</h1>
          <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em] mt-1.5 ml-0.5">万物生于您的想象</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="flex gap-2">
              <span className={`text-[9px] font-black bg-amber-50 px-2 py-1 rounded-full border border-amber-100 flex items-center gap-1 ${profile.points === 0 ? 'text-gray-300' : 'text-amber-600'}`}>🪙 {profile.gold || 0}</span>
              <span className={`text-[9px] font-black bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100 flex items-center gap-1 ${profile.points === 0 ? 'text-indigo-400 animate-pulse' : 'text-indigo-500'}`}>⚡ {profile.points || 0}</span>
            </div>
            <p className="text-[7px] font-bold text-gray-300 mt-0.5 uppercase tracking-tighter">10 Pts / 创作</p>
          </div>
          <button onClick={onOpenUser} className="w-8 h-8 rounded-full p-0.5 bg-white border border-gray-100 shadow-sm overflow-hidden active:scale-90 transition-all"><img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`} alt="avatar" className="w-full h-full rounded-full object-cover" /></button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {[ { title: '工业设计稿', url: lastWork?.imageUrl }, { title: '实景效果图', url: lastWork?.mockupUrl } ].map((v, i) => (
          <div key={i} className="bg-white rounded-[32px] p-3 border border-gray-100 shadow-sm flex flex-col min-h-[180px]">
            <p className="text-[9px] font-black text-indigo-300 uppercase mb-2 px-1">{v.title}</p>
            <div className="flex-1 bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden border border-dashed border-gray-200 cursor-zoom-in" onClick={() => v.url && onZoom(v.url)}>
              {v.url ? <img src={v.url} className="w-full h-full object-cover" /> : <span className="text-[10px] opacity-20 italic">等待创作灵感</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[40px] p-5 shadow-2xl border border-gray-100">
        <div className="flex overflow-x-auto gap-2 mb-5 hide-scrollbar">{Object.values(CATEGORIES).map(cat => (
          <button key={cat.id} onClick={() => setSelectedCat(cat.id)} className={`px-4 py-2 rounded-2xl flex items-center gap-2 transition-all min-w-fit ${selectedCat === cat.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}><span className="text-sm">{cat.icon}</span><span className="text-[11px] font-black uppercase">{cat.name}</span></button>
        ))}</div>
        <div className="grid grid-cols-3 gap-1.5 mb-5">{DESIGN_STYLES.map(style => (
          <button key={style.id} onClick={() => setSelectedStyle(style)} className={`py-2 rounded-xl text-[10px] font-black border transition-all ${selectedStyle.id === style.id ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm' : 'bg-white border-gray-100 text-gray-300'}`}>{style.name}</button>
        ))}</div>

        {/* 动态参考图预览区 */}
        {images.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto py-2 px-1 hide-scrollbar bg-gray-50/50 rounded-2xl animate-in slide-in-from-top-2 duration-300">
            {images.map((img, idx) => (
              <div key={idx} className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 border-white shadow-md group animate-in zoom-in-75 duration-200">
                <img src={img} className="w-full h-full object-cover" />
                <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-[10px] font-bold backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">×</button>
              </div>
            ))}
            {images.length < 5 && (
              <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 shrink-0 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 hover:border-indigo-200 hover:text-indigo-300 transition-colors">
                <span className="text-xl">+</span>
                <span className="text-[8px] font-bold uppercase">ADD</span>
              </button>
            )}
          </div>
        )}

        <div className="relative">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="描述您的设计灵感或上传参考图..." className="w-full bg-gray-50 rounded-[28px] p-5 pb-14 text-xs border-none focus:ring-2 focus:ring-indigo-100 min-h-[120px] resize-none" />
          
          <div className="absolute bottom-3 left-4 flex gap-2">
            <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="w-11 h-11 rounded-full bg-white border border-gray-100 text-indigo-600 flex items-center justify-center shadow-sm active:scale-90 active:bg-indigo-50 transition-all group">
              <span className="text-xl group-hover:scale-110 transition-transform">🖼️</span>
              {images.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">{images.length}</span>}
            </button>
          </div>

          <button onClick={handleGenerate} disabled={loading || !prompt} className="absolute bottom-3 right-3 w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xl active:scale-90 disabled:opacity-30 disabled:grayscale">{loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "🚀"}</button>
        </div>
        <button onClick={() => lastWork && onEnterConfig(lastWork)} disabled={!lastWork} className="w-full mt-4 py-4 bg-black text-white rounded-[24px] font-black text-sm uppercase tracking-widest active:scale-95 disabled:opacity-20 shadow-xl transition-all">进入专业配置模式 →</button>
      </div>
    </div>
  );
};

// --- 产品配置页 ---
const ConfigPage: React.FC<{ 
  work: UserWork; 
  onOrder: (order: Order) => void;
  onAddToCart: (item: Omit<CartItem, 'id' | 'addedAt'>) => void;
  cartCount: number;
  onOpenCart: () => void;
  onBack: () => void;
  onZoom: (url: string) => void;
}> = ({ work, onOrder, onAddToCart, cartCount, onOpenCart, onBack, onZoom }) => {
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
    const specDescs = Object.entries(specs).map(([key, val]) => { const opt = catInfo.options.find(o => o.key === key); const valInfo = opt?.values.find(v => v.value === val); return `${opt?.label}: ${valInfo?.name || val}`; }).join(', ');
    const newMockup = await refreshMockup(work.imageUrl.split(',')[1], work.category, specDescs, mockupUrl.split(',')[1]);
    if (newMockup) setMockupUrl(newMockup);
    setRefreshing(false);
  };

  return (
    <div className="h-screen bg-white animate-in slide-in-from-right duration-300 flex flex-col overflow-hidden">
      <div className="p-4 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-gray-50 z-[50]"><button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50 active:scale-90 transition-all">←</button><h2 className="font-black text-lg text-gray-800 italic uppercase tracking-tighter">规格配置 / Specs</h2><div className="flex gap-2"><button onClick={onOpenCart} className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shadow-sm relative active:scale-90 transition-all"><span className="text-xl">🛒</span>{cartCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">{cartCount}</span>}</button><button onClick={handleUpdatePreview} disabled={refreshing} className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-sm active:rotate-180 transition-transform">{refreshing ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> : '📸'}</button></div></div>
      <div className="flex-1 overflow-y-auto pb-48 relative">
        <SimulatedProgressBar isLoading={refreshing} type="inline" />
        <div className={`relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden transition-all ${refreshing ? 'opacity-50 blur-lg' : 'cursor-zoom-in'}`} onClick={() => !refreshing && onZoom(mockupUrl)}><img src={mockupUrl} className="max-w-full max-h-full object-contain" /><div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-black/40 backdrop-blur-md rounded-full text-[8px] font-black text-white/80 uppercase tracking-widest">预览模式</div></div>
        <div className="p-8 space-y-12"><h2 className="text-xl font-black text-gray-800 tracking-tight italic">参数选配 / Options</h2>{catInfo.options.map(opt => (<div key={opt.key}><label className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-4 block">{opt.label}</label><div className={`grid ${opt.type === 'fabric' ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>{opt.values.map(val => (<button key={val.value} onClick={() => setSpecs(prev => ({ ...prev, [opt.key]: val.value }))} className={`p-4 rounded-[24px] text-[11px] font-black border transition-all ${specs[opt.key] === val.value ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105 z-10' : 'bg-white text-gray-400 border-gray-100'}`}>{val.name} {val.extraPrice ? `(+¥${val.extraPrice})` : ''}</button>))}</div></div>))}</div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-gray-100 p-6 space-y-4 shadow-[0_-15px_40px_rgba(0,0,0,0.05)] z-[20] max-w-md mx-auto"><div className="flex justify-between items-end"><div><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">预计总额 / Total</p><p className="text-3xl font-black text-indigo-600 tracking-tighter">¥{stats.price}</p></div><div className="text-right"><p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">加工时长 / Lead Time</p><p className="text-sm font-black text-gray-800 uppercase italic">预计 {stats.leadTime} 个工作日</p></div></div><div className="flex gap-4"><button onClick={() => onAddToCart({ work, specs, price: stats.price, leadTime: stats.leadTime, mockupUrl })} className="flex-1 h-14 bg-amber-50 text-amber-600 rounded-[20px] font-black text-xs uppercase border border-amber-100 active:scale-95 transition-all">存入购物车</button><button onClick={() => onOrder({ id: '', workId: work.id, category: work.category, imageUrl: mockupUrl, specs, price: stats.price, leadTime: stats.leadTime, status: 'PENDING', qaRecords: [], createdAt: Date.now() })} className="flex-[2] h-14 bg-black text-white rounded-[20px] font-black text-xs uppercase shadow-xl active:scale-95 transition-all">确认下单 →</button></div></div>
    </div>
  );
};

// --- 其余页面保持逻辑不变 ---
const GalleryPage: React.FC<{ profile: UserProfile; onSelect: (w: UserWork) => void; onDelete: (id: string) => void; onTogglePublic: (id: string) => void; onLike: (id: string) => void; onZoom: (url: string) => void; }> = ({ profile, onSelect, onDelete, onTogglePublic, onLike, onZoom }) => {
  const [activeSubTab, setActiveSubTab] = useState<'my' | 'public'>('my');
  const publicWorks = useMemo(() => (profile.works || []).filter(w => w.isPublic).sort((a, b) => ((b.likes || 0) + (b.uses || 0) * 2 + (b.orders || 0) * 5) - ((a.likes || 0) + (a.uses || 0) * 2 + (a.orders || 0) * 5)), [profile.works]);
  return (<div className="p-4 pb-48 animate-in fade-in duration-500"><div className="flex items-center gap-8 mb-8 px-4 border-b border-gray-100"><button onClick={() => setActiveSubTab('my')} className={`pb-3 text-lg font-black transition-all ${activeSubTab === 'my' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-300'}`}>资产库</button><button onClick={() => setActiveSubTab('public')} className={`pb-3 text-lg font-black transition-all ${activeSubTab === 'public' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-300'}`}>灵感榜</button></div>{activeSubTab === 'my' ? (<div className="grid grid-cols-2 gap-4">{(profile.works || []).map(work => (<div key={work.id} className="bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-sm relative group"><div className="aspect-square bg-gray-50 cursor-zoom-in relative" onClick={() => onZoom(work.mockupUrl)}><img src={work.mockupUrl} className="w-full h-full object-cover" /><div className={`absolute top-3 left-3 px-2 py-0.5 rounded-full text-[8px] font-black text-white uppercase backdrop-blur-md ${work.isPublic ? 'bg-indigo-600/60' : 'bg-black/40'}`}>{work.isPublic ? '已公布' : '私有'}</div></div><div className="p-4"><p className="text-[10px] font-bold text-gray-400 truncate mb-4 italic leading-tight">“{work.prompt}”</p><div className="flex gap-2"><button onClick={() => onTogglePublic(work.id)} className={`flex-1 py-2 rounded-full text-[9px] font-black transition-all border ${work.isPublic ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-100 text-gray-400'}`}>{work.isPublic ? '取消公布' : '发布作品'}</button><button onClick={() => onDelete(work.id)} className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-300 rounded-full">🗑️</button></div></div></div>))}{(!profile.works || profile.works.length === 0) && <div className="col-span-2 py-40 text-center text-gray-200 font-black italic uppercase tracking-widest">暂无资产</div>}</div>) : (<div className="space-y-6">{publicWorks.map(work => (<div key={work.id} className="bg-white rounded-[48px] p-5 shadow-xl border border-gray-100 flex gap-5 items-center"><img onClick={() => onZoom(work.mockupUrl)} src={work.mockupUrl} className="w-24 h-24 rounded-[32px] object-cover border border-gray-100 shadow-inner" /><div className="flex-1 min-w-0"><h4 className="font-black text-gray-800 text-sm truncate uppercase tracking-tighter">{CATEGORIES[work.category]?.name}</h4><div className="flex items-center gap-2 mt-3"><button onClick={() => onLike(work.id)} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-500 text-[9px] font-black border border-red-100">❤️ {work.likes || 0}</button><div className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-500 text-[9px] font-black border border-indigo-100">📐 {work.uses || 0}</div><div className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-500 text-[9px] font-black border border-emerald-100">📦 {work.orders || 0}</div></div></div><button onClick={() => onSelect(work)} className="w-14 h-14 bg-black text-white rounded-[24px] flex flex-col items-center justify-center shadow-xl active:scale-90 transition-all"><span className="text-xl">📐</span><span className="text-[8px] font-black uppercase">引用</span></button></div>))}{publicWorks.length === 0 && <div className="py-40 text-center text-gray-200 font-black italic uppercase tracking-widest">社区待创作</div>}</div>)}</div>);
};

const OrderProgressPage: React.FC<{ orders: Order[]; onZoom: (url: string) => void; }> = ({ orders = [], onZoom }) => (<div className="p-4 pb-48 animate-in fade-in duration-500"><h1 className="text-2xl font-black mb-8 px-2 tracking-tight uppercase italic">生产队列 / Progress</h1><div className="space-y-6">{orders.map(order => (<div key={order.id} className="bg-white rounded-[44px] p-6 shadow-xl border border-gray-50"><div className="flex gap-6 mb-6"><img onClick={() => onZoom(order.imageUrl)} src={order.imageUrl} className="w-24 h-24 bg-gray-50 rounded-[28px] object-cover border border-gray-100 cursor-zoom-in" /><div className="flex-1"><h4 className="font-black text-gray-800 text-lg tracking-tight uppercase tracking-tight">{CATEGORIES[order.category]?.name || '定制产品'}</h4><p className="text-[9px] text-indigo-300 font-bold uppercase mt-1 italic tracking-tight">预计周期: {order.leadTime}天</p><span className="inline-block mt-4 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-tighter animate-pulse border border-emerald-100 shadow-sm">智能排产中</span></div></div><div className="bg-gray-50 rounded-[32px] p-6 flex justify-between items-center relative overflow-hidden"><div className="absolute top-0 left-0 h-1 bg-emerald-400 rounded-full w-1/5 shadow-sm shadow-emerald-200"></div>{['审核', '制造', '质检', '配送', '签收'].map((s, i) => (<div key={s} className={`flex flex-col items-center gap-2 ${i===0?'text-emerald-500':'text-gray-300'}`}><div className={`w-3 h-3 rounded-full border-2 transition-all ${i===0?'bg-emerald-500 border-emerald-100 shadow-lg scale-125':'bg-white border-gray-100'}`} /><span className="text-[8px] font-black tracking-tighter uppercase">{s}</span></div>))}</div></div>))}{(!orders || orders.length === 0) && <div className="py-40 text-center text-gray-200 font-black italic uppercase tracking-widest">暂无活跃订单</div>}</div></div>);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('design');
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [lastWork, setLastWork] = useState<UserWork | null>(null);
  const [configuringWork, setConfiguringWork] = useState<UserWork | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [triggerGenerationAfterLogin, setTriggerGenerationAfterLogin] = useState(false);

  useEffect(() => { saveProfile(profile); }, [profile]);
  useEffect(() => { if (triggerGenerationAfterLogin && profile.points >= GENERATION_COST) { setTriggerGenerationAfterLogin(false); } }, [profile.points, triggerGenerationAfterLogin]);

  const handleGenerated = (work: UserWork) => { setProfile(p => ({ ...p, works: [work, ...(p.works || [])] })); setLastWork(work); };
  const handleOrder = (order: Order) => { const finalOrder = { ...order, id: `C2M-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, createdAt: Date.now() }; setProfile(p => ({ ...p, works: (p.works || []).map(w => w.id === order.workId ? { ...w, orders: (w.orders || 0) + 1 } : w), orders: [finalOrder, ...(p.orders || [])] })); setIsCartOpen(false); setActiveTab('orders'); };

  const shouldShowNavBar = activeTab !== 'custom';

  return (
    <div className="min-h-screen max-w-md mx-auto relative bg-white text-gray-900 overflow-x-hidden flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      <div className="flex-1 transition-all duration-300">
        {activeTab === 'design' && (<WorkspacePage profile={profile} lastWork={lastWork} prompt={prompt} setPrompt={setPrompt} onGenerated={handleGenerated} deductPoints={() => setProfile(p => ({ ...p, points: (p.points || 0) - GENERATION_COST }))} onZoom={setZoomedImage} onOpenUser={() => setIsUserModalOpen(true)} onEnterConfig={(w) => { setConfiguringWork(w); setActiveTab('custom'); }} />)}
        {activeTab === 'custom' && configuringWork && (<ConfigPage work={configuringWork} onOrder={handleOrder} onAddToCart={(item) => setProfile(p => ({ ...p, cart: [{ ...item, id: Math.random().toString(36).substr(2, 9), addedAt: Date.now() }, ...(p.cart || [])] }))} cartCount={profile?.cart?.length || 0} onOpenCart={() => setIsCartOpen(true)} onBack={() => setActiveTab('design')} onZoom={setZoomedImage} />)}
        {activeTab === 'gallery' && (<GalleryPage profile={profile} onSelect={(work) => { setProfile(p => ({...p, works: (p.works || []).map(w => w.id === work.id ? { ...w, uses: (w.uses || 0) + 1 } : w)})); setConfiguringWork(work); setActiveTab('custom'); }} onDelete={(id) => setProfile(p => ({...p, works: (p.works || []).filter(w => w.id !== id)}))} onTogglePublic={(id) => setProfile(p => ({...p, works: (p.works || []).map(w => w.id === id ? { ...w, isPublic: !w.isPublic } : w)}))} onLike={(id) => setProfile(p => ({...p, works: (p.works || []).map(w => w.id === id ? { ...w, likes: (w.likes || 0) + 1 } : w)}))} onZoom={setZoomedImage} />)}
        {activeTab === 'orders' && <OrderProgressPage orders={profile.orders || []} onZoom={setZoomedImage} />}
      </div>
      {shouldShowNavBar && <NavBar active={activeTab} onChange={setActiveTab} />}
      <CartDrawer items={profile.cart || []} isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onZoom={setZoomedImage} onOrder={(item) => handleOrder({ id: '', workId: item.work.id, category: item.work.category, imageUrl: item.mockupUrl, specs: item.specs, price: item.price, leadTime: item.leadTime, status: 'PENDING', qaRecords: [], createdAt: Date.now() })} onRemove={(id) => setProfile(p => ({ ...p, cart: (p.cart || []).filter(item => item.id !== id) }))} />
      <UserCenterModal 
        profile={profile} 
        isOpen={isUserModalOpen} 
        onClose={() => setIsUserModalOpen(false)} 
        onUpdateName={(name) => setProfile(p => ({ ...p, nickname: name }))} 
        onLogin={(refCode) => { 
          const hasReferral = refCode && refCode.trim().length > 0;
          setProfile(p => ({ 
            ...p, 
            id: `USER-${Math.random().toString(36).substr(2, 6).toUpperCase()}`, 
            nickname: p.nickname === '游客' ? '灵感家' : p.nickname, 
            points: p.points + INITIAL_POINTS + (hasReferral ? REFERRAL_BONUS_POINTS : 0),
            referralCode: p.referralCode || `NICE-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
          })); 
          setTriggerGenerationAfterLogin(true); 
          setIsUserModalOpen(false); 
          setActiveTab('design'); 
          if (hasReferral) alert('邀请成功！额外 500⚡ 奖励已到账。');
        }} 
      />
      {zoomedImage && <ImageModal url={zoomedImage} onClose={() => setZoomedImage(null)} />}
    </div>
  );
};

export default App;
