import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_API_KEY = "sk-9886e341072247268c3ba69451c5773f";
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

interface DescribeRequest {
  url: string;
}

async function fetchUrlContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 saniye timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Site çok fazla istek nedeniyle engelledi. Lütfen birkaç dakika bekleyip tekrar deneyin veya tanımı manuel girin.");
      }
      if (response.status === 403) {
        throw new Error("Site erişimi engelledi. Bu site otomatik analizi desteklemiyor olabilir. Lütfen tanımı manuel girin.");
      }
      throw new Error(`Site erişim hatası (HTTP ${response.status}). Lütfen tanımı manuel girin.`);
    }

    const html = await response.text();

    // Title'ı çıkar
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    // Meta description'ı çıkar
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : "";

    // HTML'den metin çıkar
    let textContent = html
      // Script ve style taglerini kaldır
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      // HTML taglerini kaldır
      .replace(/<[^>]+>/g, " ")
      // HTML entities decode
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&[a-z]+;/gi, " ")
      // Fazla boşlukları temizle
      .replace(/\s+/g, " ")
      .trim();

    // Title ve meta description'ı başa ekle
    const enrichedContent = `
Site Başlığı: ${title}
Meta Açıklama: ${metaDesc}

Site İçeriği:
${textContent.slice(0, 4000)}
`.trim();

    return enrichedContent;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Bağlantı zaman aşımına uğradı (15 saniye). Site yanıt vermiyor olabilir.");
      }
      throw new Error(`Site erişim hatası: ${error.message}`);
    }
    throw new Error("Bilinmeyen bir hata oluştu");
  }
}

async function generateDescription(content: string, url: string): Promise<string> {
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
            "Sen bir işletme analisti ve SEO uzmanısın. Verilen web sitesi içeriğinden işletmenin ne yaptığını, hangi hizmetleri/ürünleri sunduğunu analiz edip kısa ve öz bir işletme tanımı oluştur. Tanım 2-4 cümle olsun, Türkçe ve SEO dostu olsun. Sadece tanımı yaz, başka açıklama ekleme.",
        },
        {
          role: "user",
          content: `URL: ${url}\n\n${content}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("DeepSeek API Error:", errorText);
    throw new Error("AI servisi şu anda yanıt vermiyor. Lütfen tekrar deneyin.");
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

export async function POST(request: NextRequest) {
  try {
    const body: DescribeRequest = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL gerekli" },
        { status: 400 }
      );
    }

    // URL formatını kontrol et
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return NextResponse.json(
        { success: false, error: "Geçersiz URL formatı. http:// veya https:// ile başlamalı." },
        { status: 400 }
      );
    }

    // Sosyal medya sitelerini kontrol et
    const socialMediaDomains = [
      "instagram.com",
      "facebook.com",
      "twitter.com",
      "x.com",
      "tiktok.com",
      "linkedin.com",
      "youtube.com",
      "pinterest.com",
      "snapchat.com",
      "reddit.com",
    ];

    const urlLower = url.toLowerCase();
    const isSocialMedia = socialMediaDomains.some(domain => urlLower.includes(domain));

    if (isSocialMedia) {
      return NextResponse.json(
        {
          success: false,
          error: "Sosyal medya siteleri (Instagram, Facebook, vb.) otomatik analizi desteklemez. Lütfen işletme tanımını manuel olarak girin."
        },
        { status: 400 }
      );
    }

    console.log("Fetching URL:", url);

    // URL içeriğini al
    const content = await fetchUrlContent(url);

    if (!content || content.length < 50) {
      return NextResponse.json(
        { success: false, error: "Site içeriği alınamadı veya yetersiz. Site JavaScript gerektiriyor olabilir." },
        { status: 400 }
      );
    }

    console.log("Content length:", content.length);

    // DeepSeek ile tanım oluştur
    const description = await generateDescription(content, url);

    return NextResponse.json({
      success: true,
      description,
    });
  } catch (error) {
    console.error("Describe error:", error);

    const errorMessage = error instanceof Error
      ? error.message
      : "Bir hata oluştu. Lütfen tekrar deneyin.";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
