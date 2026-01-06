
import { GoogleGenAI } from "@google/genai";
import { Category } from "./types";

// 使用环境变量中的 API_KEY
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
    [Category.TSHIRT]: "时尚潮牌T恤",
    [Category.PHONE_CASE]: "高端手机保护壳",
    [Category.MOUSEPAD]: "高性能电竞鼠标垫",
    [Category.BEDDING]: "豪华酒店系列床品"
  };

  const modelName = 'gemini-2.5-flash-image';

  try {
    const designParts: any[] = referenceImages.map(img => ({
      inlineData: { data: img.split(',')[1] || img, mimeType: 'image/png' }
    }));

    // --- 第一张：工业设计稿 (纯平面图样/纹理稿) ---
    const designPrompt = `你现在是一位顶级平面设计师与色彩专家。
    任务：为 ${catNames[category]} 创作一张 9:16 的【高清印刷图样/平面纹理稿】。
    
    视觉要求：
    1. 核心属性：这必须是一个纯平面的、无透视、无产品阴影的【印刷图案 (Flat Print Pattern)】。
    2. 布局：展示图案的完整设计，不要显示实物外形，只需图案本身。
    3. 背景：纯白色背景，无杂质。
    4. 内容：基于提示词 "${prompt}"，结合风格 "${stylePrompt}"。
    5. 目的：该图片将作为生产工厂的原始印刷源文件。`;

    designParts.push({ text: designPrompt });

    const designResponse = await ai.models.generateContent({
      model: modelName,
      contents: { parts: designParts },
      config: { imageConfig: { aspectRatio: "9:16" } }
    });

    const designBase64 = extractImageBase64(designResponse);
    if (!designBase64) throw new Error("生成设计图样失败");

    const designUrl = `data:image/png;base64,${designBase64}`;

    // --- 第二张：实景展示看板 (针对T恤优化模特实拍效果) ---
    let lifestyleDesc = "";
    if (category === Category.TSHIRT) {
      lifestyleDesc = `【真实模特实拍】：必须展示一位气质出众的模特穿着该 T 恤，身处自然的现实生活场景中（如洒满阳光的街道、清晨的公园或现代简约的咖啡厅）。
       - 要求：展示 T 恤在人体上的真实垂坠感、剪裁细节以及图案在真实面料上的折痕与光影效果。
       - 摄影风格：高级商业生活方式摄影，光影柔和自然，杜绝生硬的人造感。`;
    } else {
      lifestyleDesc = `【自然生活化实景应用图】：将设计图案应用在 ${catNames[category]} 实物上，置于高度真实的现实生活场景中。
       - 场景参考：自然光影流动的居家桌面、充满生活气息的室内空间。
       - 视觉风格：高级商业摄影，光影极其自然，有真实的反射与环境交互。`;
    }

    const portfolioPrompt = `任务：创作一张 9:16 的【极致专业设计展示看板】。
    
    【核心布局逻辑 - 垂直二段式】：
    1. 上部 (占图面 1/2)：${lifestyleDesc}
    
    2. 分隔线：上下部分由一条极细的浅灰色虚线分隔。
    
    3. 下部 (占图面 1/2)：【工业级 360 度产品细节组图】
       - 要求：展示产品在极简影棚背景下的 3D 渲染效果。
       - 内容：包含产品的多角度视图（如正视图、侧视图、45度视图）及微距材质特写。
       - 风格：强调工业设计美学，精准还原材质细节，光影表现专业且锐利。
    
    【技术规范】：
    - 图案一致性：实物上的设计图案必须与第一张生成的平面图样完全锁定一致。
    - 整体美学：背景色采用简洁的中性白或极浅灰色，确保画面精致且极具设计感。`;

    const mockupResponse = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { data: designBase64, mimeType: 'image/png' } },
          { text: portfolioPrompt },
        ],
      },
      config: { imageConfig: { aspectRatio: "9:16" } }
    });

    const mockupBase64 = extractImageBase64(mockupResponse);
    return { designUrl, mockupUrl: `data:image/png;base64,${mockupBase64}` };
  } catch (error) {
    console.error("AI 生成错误:", error);
    throw error;
  }
};

export const refreshMockup = async (designBase64: string, category: Category, specDesc: string, referenceMockupBase64: string) => {
  const lifestyleSpec = category === Category.TSHIRT ? "真实模特在自然场景中的穿着效果" : "自然生活化的实物场景展示";
  const updatePrompt = `任务：基于新规格 "${specDesc}" 更新 9:16 专业看板。
  
  布局与质感要求：
  1. 上部 1/2：维持高自然度的${lifestyleSpec}。
  2. 下部 1/2：维持极致细腻的工业级材质渲染与多维展示。
  3. 细节：根据规格微调材质（如面料克重、外壳质感），但必须保持设计图案的绝对一致。`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: designBase64, mimeType: 'image/png' } }, 
          { inlineData: { data: referenceMockupBase64, mimeType: 'image/png' } },
          { text: updatePrompt },
        ],
      },
      config: { imageConfig: { aspectRatio: "9:16" } }
    });

    const base64 = extractImageBase64(response);
    return base64 ? `data:image/png;base64,${base64}` : null;
  } catch (error) {
    console.error("看板更新错误:", error);
    return null;
  }
};
