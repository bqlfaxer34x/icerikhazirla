import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_API_KEY = "sk-9886e341072247268c3ba69451c5773f";
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

// Türkçe dil adlarını AI için İngilizce kodlara çevir
const languageMap: Record<string, string> = {
  "Türkçe": "Turkish",
  "İngilizce": "English",
  "Almanca": "German",
  "Fransızca": "French",
  "İspanyolca": "Spanish",
  "İtalyanca": "Italian",
  "Portekizce": "Portuguese",
  "Rusça": "Russian",
  "Arapça": "Arabic",
  "Japonca": "Japanese",
  "Korece": "Korean",
  "Çince": "Chinese"
};

interface GenerateRequest {
  url: string;
  keyword: string;
  brand: string;
  description: string;
  language: string;
  contentType: string;
  wordCount: number;
  batchSize: number;
}

const contentTypeLabels: Record<string, string> = {
  forum: "Forum / Yorum İçerikleri",
  bio: "Profil / Bio Metinleri",
  article: "Makale Paragrafları",
  social: "Sosyal Medya Paylaşımları",
};

// Regex özel karakterlerini escape et
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function generateContent(prompt: string): Promise<string> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "You are an SEO and content expert. Generate backlink content in the specified language. Create natural, original content using the given URL and keyword. Embed the keyword as an HTML link in each piece of content. Write only the requested content, no additional explanations or titles. Strictly adhere to the specified word count.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function getPromptForType(
  type: string,
  linkHtml: string,
  keyword: string,
  brand: string,
  description: string,
  language: string,
  batchSize: number,
  wordCount: number
): string {
  const targetLanguage = languageMap[language] || language;

  const baseInfo = `
Target Language: ${targetLanguage}
Brand: ${brand}
Business Description: ${description}
Link to insert: ${linkHtml}
Number of contents to generate: ${batchSize}
Each content must be EXACTLY ${wordCount} words (strictly follow this rule!)
`;

  const prompts: Record<string, string> = {
    forum: `${baseInfo}
Generate ${batchSize} different natural comment texts that can be used in forums and comment sections in ${targetLanguage}.
Each comment must be EXACTLY ${wordCount} words. Strictly adhere to the word count!
Use this HTML link instead of the keyword "${keyword}": ${linkHtml}
Comments should be natural and not look like spam. Write only the content, no additional explanations.
Separate each comment with ---`,

    bio: `${baseInfo}
Generate ${batchSize} different bio/about texts for website profile pages and about sections in ${targetLanguage}.
Each text must be EXACTLY ${wordCount} words.
Use this HTML link instead of the keyword "${keyword}": ${linkHtml}

RULES:
- Do NOT use first-person pronouns (I, We, Our, Us)
- Use the brand name in third person (e.g., "${brand} is a leading...")
- Do NOT write in comment or forum style
- Use natural, fluent, and quality language
- Create professional but not artificial content that supports brand identity
- Only provide information, do not ask questions or give advice

Write only the content. Separate each text with ---`,

    article: `${baseInfo}
Generate ${batchSize} different paragraphs that can be used in blog posts or articles in ${targetLanguage}.
Each paragraph must be EXACTLY ${wordCount} words. Strictly adhere to the word count!
Use this HTML link instead of the keyword "${keyword}": ${linkHtml}
Paragraphs should be informative and natural. Write only the content, no additional explanations.
Separate each paragraph with ---`,

    social: `${baseInfo}
Generate ${batchSize} different texts that can be used in social media posts in ${targetLanguage}.
Each text must be EXACTLY ${wordCount} words. Strictly adhere to the word count!
Use this HTML link instead of the keyword "${keyword}": ${linkHtml}
Texts should be attention-grabbing and shareable. Write only the content, no additional explanations.
Separate each text with ---`,
  };

  return prompts[type] || prompts.forum;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const {
      url,
      keyword,
      brand,
      description,
      language,
      contentType,
      wordCount,
      batchSize,
    } = body;

    const linkHtml = `<a href="${url}">${keyword}</a>`;

    const prompt = getPromptForType(
      contentType,
      linkHtml,
      keyword,
      brand,
      description,
      language,
      batchSize,
      wordCount
    );

    const content = await generateContent(prompt);

    // İçerikleri ayır ve her birinde keyword'ü linkle
    const items = content
      .split("---")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((item) => {
        // Eğer içerikte zaten link varsa dokunma
        if (item.includes("<a href=")) {
          return item;
        }
        // Keyword'ü bul ve linkle (case-insensitive)
        const keywordRegex = new RegExp(`(${escapeRegExp(keyword)})`, "gi");
        // Sadece ilk eşleşmeyi linkle
        let linked = false;
        return item.replace(keywordRegex, (match) => {
          if (!linked) {
            linked = true;
            return `<a href="${url}" target="_blank" rel="dofollow">${match}</a>`;
          }
          return match;
        });
      });

    return NextResponse.json({
      success: true,
      data: {
        type: contentType,
        title: contentTypeLabels[contentType] || "İçerikler",
        items,
      },
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bir hata oluştu",
      },
      { status: 500 }
    );
  }
}
