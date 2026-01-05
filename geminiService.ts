
import { GoogleGenAI } from "@google/genai";
import { Category } from "./types";

// Always use process.env.API_KEY directly as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const extractImageBase64 = (response: any): string => {
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }
  return "";
};

export const generateDesignPair = async (prompt: string, category: Category, stylePrompt: string, referenceImages: string[] = []) => {
  const catNames = {
    [Category.TSHIRT]: "Professional Fashion T-shirt",
    [Category.PHONE_CASE]: "Premium Phone Protection Case",
    [Category.MOUSEPAD]: "High-Performance Gaming Mousepad",
    [Category.BEDDING]: "Luxury Hotel Collection Bedding"
  };

  const modelName = 'gemini-2.5-flash-image';

  try {
    const designParts: any[] = referenceImages.map(img => ({
      inlineData: { data: img.split(',')[1] || img, mimeType: 'image/png' }
    }));

    const designPrompt = `你现在是一位顶级工业视觉顾问。
    任务：为 ${catNames[category]} 创作一个极致简约的平面生产设计图。
    需求： "${prompt}"
    风格： "${stylePrompt}"
    
    规范：
    1. 产出必须是纯平面、白底、无透视、高分辨率的2D设计稿。
    2. 深度提取参考图中的核心元素。`;

    designParts.push({ text: designPrompt });

    const designResponse = await ai.models.generateContent({
      model: modelName,
      contents: { parts: designParts }
    });

    const designBase64 = extractImageBase64(designResponse);
    if (!designBase64) throw new Error("Failed to generate design");

    const designUrl = `data:image/png;base64,${designBase64}`;

    // --- 极致专业作品集排版逻辑 ---
    let categoryVision = "";
    switch (category) {
      case Category.MOUSEPAD:
        categoryVision = `
          【3/4 场景】：一个极简主义的现代工作站桌面，光线柔和。${catNames[category]} 平整铺设，上方放置着昂贵的铝合金键盘。
          【1/4 渲染】：鼠标垫的边缘微距特写。展示极其精密的缝线工艺、侧面厚度以及背面的防滑橡胶纹理。
          【要求】：必须强调大尺寸的长方形视觉感，严禁出现手机壳或衣服特征。`;
        break;
      case Category.PHONE_CASE:
        categoryVision = `
          【3/4 场景】：一只拿着手机的手（或放在精致的大理石台面上），手机背面朝外。展现高端商业摄影风格。
          【1/4 渲染】：手机壳顶部的 3D 渲染视图。展示完美的摄像头孔位剪裁、侧边独立按键细节、以及内衬的植绒质感。
          【要求】：严禁图案出现在屏幕上，只能在背面。`;
        break;
      case Category.TSHIRT:
        categoryVision = `
          【3/4 场景】：一名极具气质的模特在极简白棚中穿着该T恤。构图平衡，类似时尚大牌画册。
          【1/4 渲染】：T恤领口或袖口的工业特写。展示高支棉的致密纹理、平整的双针走线以及领口罗纹的弹性细节。`;
        break;
      case Category.BEDDING:
        categoryVision = `
          【3/4 场景】：采光极佳的高端现代卧室。床品铺设平整，透着丝滑的商业摄影感。
          【1/4 渲染】：枕套边缘或被面局部特写。展示高级隐形拉链工艺和面料的垂坠光泽感。`;
        break;
    }

    const presentationPrompt = `任务：创作一张 9:16 的【${catNames[category]} 专业设计展示板】。
    
    【核心架构：视觉完整体】
    1. 整体布局：垂直 9:16 杂志布局。上方 3/4 为实景图，下方 1/4 为 3D 技术渲染图。
    2. 视觉一致性：【关键】上下两个部分展示的必须是【同一个 SKU、同一个品类、同一种材质】。严禁混淆产品品类！
    3. 摄影标准：
       - 高级商业摄影风格，模拟 50mm 或 85mm 镜头深度，柔和的影棚灯光（Studio Lighting）。
       - 色调优雅，背景极简且干净（Off-white 或 Light Gray）。
    4. 品类细节：${categoryVision}
    5. 分隔与标注：
       - 上下两部分由精美、极细的线条和少量工业参数文字优雅地分隔。
       - 中间或底部标注：SERIES: NICE AI CREATIVE / ITEM: ${catNames[category]}。
    
    将提供的设计图完美地、透视准确地应用到产品表面。`;

    const mockupResponse = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { data: designBase64, mimeType: 'image/png' } },
          { text: presentationPrompt },
        ],
      },
      config: {
        imageConfig: { aspectRatio: "9:16" }
      }
    });

    const mockupBase64 = extractImageBase64(mockupResponse);
    return { designUrl, mockupUrl: `data:image/png;base64,${mockupBase64}` };
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};

export const refreshMockup = async (designBase64: string, category: Category, specDesc: string, referenceMockupBase64: string) => {
  const lifestylePrompt = `【专业规格更新 - 视觉完整体维护】
  
  任务：基于规格 "${specDesc}" 更新 9:16 设计展示板。
  
  强制准则：
  1. **绝对禁令**：禁止改变产品品类。如果当前是 ${category}，则新图中上下两部分必须依然是 ${category}。
  2. **图案同步**：必须将第一张设计稿的图案精准地应用到产品的对应位置。
  3. **杂志级质感**：维持 3/4 商业摄影与 1/4 工业细节的布局，保留原有的高级灰色调和专业灯光效果。
  4. **局部刷新**：仅根据描述修改产品的底色或材质细节，环境氛围不得剧烈变动。
  
  请生成更新后的专业展示板图片。`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: designBase64, mimeType: 'image/png' } }, 
          { inlineData: { data: referenceMockupBase64, mimeType: 'image/png' } },
          { text: lifestylePrompt },
        ],
      },
      config: {
        imageConfig: { aspectRatio: "9:16" }
      }
    });

    const base64 = extractImageBase64(response);
    return base64 ? `data:image/png;base64,${base64}` : null;
  } catch (error) {
    console.error("Mockup Refresh Error:", error);
    return null;
  }
};
