import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_API_KEY = "sk-9886e341072247268c3ba69451c5773f";
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

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
            "Sen bir SEO ve içerik uzmanısın. Geri bağlantı içerikleri oluşturuyorsun. Verilen URL ve anahtar kelimeyi kullanarak doğal, özgün içerikler üret. Her içerikte anahtar kelimeyi HTML link olarak göm. Sadece istenen içerikleri yaz, başka açıklama veya başlık ekleme. Belirtilen kelime sayısına kesinlikle uy.",
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
  const baseInfo = `
Dil: ${language}
Marka: ${brand}
İşletme: ${description}
Link: ${linkHtml}
Üretilecek içerik sayısı: ${batchSize}
Her içerik tam olarak ${wordCount} kelime olmalı (bu kurala kesinlikle uy!)
`;

  const prompts: Record<string, string> = {
    forum: `${baseInfo}
Bu bilgileri kullanarak forum ve yorum bölümlerinde kullanılabilecek ${batchSize} farklı doğal yorum metni yaz.
Her yorum TAM OLARAK ${wordCount} kelime olmalı. Kelime sayısına kesinlikle uy!
İçinde "${keyword}" kelimesi yerine şu HTML linki kullan: ${linkHtml}
Yorumlar doğal ve spam gibi görünmemeli. Sadece içerikleri yaz, başka açıklama ekleme.
Her yorumu --- ile ayır.`,

    bio: `${baseInfo}
Web sitesi profil sayfaları, "Hakkında" bölümleri ve bio alanları için ${batchSize} farklı tanıtım metni yaz.
Her metin TAM OLARAK ${wordCount} kelime olmalı.
İçinde "${keyword}" kelimesi yerine şu HTML linki kullan: ${linkHtml}

KURALLAR:
- "Biz", "Ben", "Firmamız" gibi 1. şahıs zamirleri KULLANMA
- Marka adını 3. şahıs olarak kullan (örn: "${brand}, sektörde...")
- Yorum veya forum yazısı tarzında YAZMA
- Doğal, akıcı ve kaliteli bir dil kullan
- Marka kimliğini destekleyen, profesyonel ama yapay olmayan içerik üret
- Sadece bilgi ver, soru sorma veya tavsiye verme

Sadece içerikleri yaz. Her metni --- ile ayır.`,

    article: `${baseInfo}
Bu bilgileri kullanarak blog veya makale içinde kullanılabilecek ${batchSize} farklı paragraf yaz.
Her paragraf TAM OLARAK ${wordCount} kelime olmalı. Kelime sayısına kesinlikle uy!
İçinde "${keyword}" kelimesi yerine şu HTML linki kullan: ${linkHtml}
Paragraflar bilgilendirici ve doğal olmalı. Sadece içerikleri yaz, başka açıklama ekleme.
Her paragrafı --- ile ayır.`,

    social: `${baseInfo}
Bu bilgileri kullanarak sosyal medya paylaşımlarında kullanılabilecek ${batchSize} farklı metin yaz.
Her metin TAM OLARAK ${wordCount} kelime olmalı. Kelime sayısına kesinlikle uy!
İçinde "${keyword}" kelimesi yerine şu HTML linki kullan: ${linkHtml}
Metinler dikkat çekici ve paylaşılabilir olmalı. Sadece içerikleri yaz, başka açıklama ekleme.
Her metni --- ile ayır.`,
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
