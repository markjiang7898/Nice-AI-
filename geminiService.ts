
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
    [Category.TSHIRT]: "T-shirt",
    [Category.PHONE_CASE]: "Phone Case",
    [Category.MOUSEPAD]: "Mousepad",
    [Category.BEDDING]: "Bedding Set"
  };

  const modelName = 'gemini-2.5-flash-image';

  try {
    // 构造设计生成的输入部分：包含多张参考图和专业设计指令
    const designParts: any[] = referenceImages.map(img => ({
      inlineData: { data: img.split(',')[1] || img, mimeType: 'image/png' }
    }));

    // 核心提示词：要求 AI 作为专业产品设计师，融合多维信息
    const designPrompt = `你现在是一位世界顶尖的工业设计师和商业插画师。
    
    任务：为 ${catNames[category]} 产品创作一个专业的、可直接用于生产的【平面设计图稿】。
    用户核心需求： "${prompt}"
    整体视觉风格定位： "${stylePrompt}"
    
    参考资料分析要求：
    1. 深度提取附件图片中的视觉DNA（包括色调、纹理、构图元素或特定符号）。
    2. 将参考图的视觉风格与用户的文字描述进行高级合成，避免简单的拼接。
    3. 产出物必须是平面的、高对比度的、干净的2D图形。
    4. 背景必须为纯白色，确保没有多余的阴影或透视，以便后续进行工业转印。
    5. 设计需具有商业美感，符合现代审美趋势。
    
    输出要求：仅输出平面设计图，严禁包含任何3D产品预览、样机或多余文字。`;

    designParts.push({ text: designPrompt });

    const designResponse = await ai.models.generateContent({
      model: modelName,
      contents: { parts: designParts }
    });

    const designBase64 = extractImageBase64(designResponse);
    if (!designBase64) throw new Error("Failed to generate professional design draft");

    const designUrl = `data:image/png;base64,${designBase64}`;

    // 样机生成提示词优化
    let lifestylePrompt = "";
    if (category === Category.TSHIRT) {
      lifestylePrompt = `将提供的平面设计图完美地应用到这件T恤样机上。
      要求：分屏布局。左侧为模特在极简工业风摄影棚穿着该T恤的实拍效果，右侧为T恤的正背面平铺图。
      光影必须真实，保持8K商业摄影质感。`;
    } else {
      lifestylePrompt = `将提供的平面设计图应用到 ${catNames[category]} 产品上。
      场景：高端商业摄影棚环境，柔和的顶级光影。
      要求：极致写实，细节达到8K分辨率，展现产品真实质感。`;
    }

    const mockupResponse = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { data: designBase64, mimeType: 'image/png' } },
          { text: lifestylePrompt },
        ],
      },
    });

    const mockupBase64 = extractImageBase64(mockupResponse);
    if (!mockupBase64) throw new Error("Failed to generate lifestyle mockup");

    return { designUrl, mockupUrl: `data:image/png;base64,${mockupBase64}` };
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};

/**
 * 局部刷新逻辑：保持样机一致性
 */
export const refreshMockup = async (designBase64: string, category: Category, specDesc: string, referenceMockupBase64: string) => {
  const catNames = {
    [Category.TSHIRT]: "T-shirt",
    [Category.PHONE_CASE]: "Phone Case",
    [Category.MOUSEPAD]: "Mousepad",
    [Category.BEDDING]: "Bedding Set"
  };

  const lifestylePrompt = `严格视觉一致性任务。
  当前产品：${catNames[category]}。
  变更需求：根据以下规格修改产品物理属性（如颜色或材质）："${specDesc}"。
  
  关键约束：
  1. 必须精准保持第一张参考图（设计稿）中的图案内容、位置和比例不变。
  2. 必须保持第二张参考图（当前样机）的光影、背景、机位和模特状态不变。
  3. 仅修改规格相关的颜色或纹理。输出需呈现极致的真实商业质感。`;

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
    });

    const base64 = extractImageBase64(response);
    return base64 ? `data:image/png;base64,${base64}` : null;
  } catch (error) {
    console.error("Mockup Refresh Error:", error);
    return null;
  }
};
