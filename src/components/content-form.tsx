"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ContentFormProps {
  onGenerate: (data: FormData) => void;
  isLoading: boolean;
}

export interface UrlKeywordPair {
  url: string;
  keyword: string;
}

export interface FormData {
  urlKeywordPairs: UrlKeywordPair[];
  brand: string;
  description: string;
  language: string;
  contentType: string;
  wordCount: number;
  totalCount: number;
}

const languages = [
  "Türkçe",
  "İngilizce",
  "Almanca",
  "Fransızca",
  "İspanyolca",
  "İtalyanca",
  "Portekizce",
  "Rusça",
  "Arapça",
  "Japonca",
  "Korece",
  "Çince",
];

const contentTypes = [
  { value: "forum", label: "Forum / Yorum İçerikleri" },
  { value: "bio", label: "Profil / Bio Metinleri" },
  { value: "article", label: "Makale Paragrafları" },
  { value: "social", label: "Sosyal Medya Paylaşımları" },
];

const wordCounts = [
  { value: "60", label: "60 kelime" },
  { value: "100", label: "100 kelime" },
  { value: "150", label: "150 kelime" },
  { value: "200", label: "200 kelime" },
  { value: "300", label: "300 kelime" },
];

const totalCounts = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export function ContentForm({ onGenerate, isLoading }: ContentFormProps) {
  const [urlKeywordsText, setUrlKeywordsText] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("Türkçe");
  const [contentType, setContentType] = useState("bio");
  const [wordCount, setWordCount] = useState("100");
  const [totalCount, setTotalCount] = useState("10");
  const [isDescribing, setIsDescribing] = useState(false);

  // Satır sayısını hesapla
  const lineCount = urlKeywordsText.split("\n").filter(line => line.trim()).length;

  const extractUrlFromString = (urlKeyword: string): string | null => {
    if (!urlKeyword.trim()) return null;

    const parts = urlKeyword.split(":");
    if (parts.length < 2) return null;

    const protocol = parts[0].toLowerCase();
    if (protocol !== "https" && protocol !== "http") return null;

    const rest = parts.slice(1).join(":");
    const lastColonIndex = rest.lastIndexOf(":");

    if (lastColonIndex === -1) {
      return `${protocol}:${rest}`.trim();
    }

    const urlPart = rest.substring(0, lastColonIndex);
    return `${protocol}:${urlPart}`.trim();
  };

  const handleAutoDescribe = async () => {
    const firstLine = urlKeywordsText.split("\n").find(line => line.trim());
    const url = firstLine ? extractUrlFromString(firstLine) : null;

    if (!url) {
      alert("Önce geçerli bir URL girin.\n\nÖrnek: https://example.com:anahtar kelime");
      return;
    }

    setIsDescribing(true);

    try {
      const response = await fetch("/api/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Tanım oluşturulamadı");
      }

      setDescription(result.description);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Bir hata oluştu";
      alert(`Hata: ${errorMsg}\n\nURL: ${url}`);
    } finally {
      setIsDescribing(false);
    }
  };

  const parseUrlKeyword = (urlKeyword: string): UrlKeywordPair | null => {
    const parts = urlKeyword.split(":");
    if (parts.length < 2) return null;

    const protocol = parts[0];
    const rest = parts.slice(1).join(":");
    const lastColonIndex = rest.lastIndexOf(":");

    if (protocol !== "https" && protocol !== "http") return null;

    const urlPart = rest.substring(0, lastColonIndex);
    const keyword = rest.substring(lastColonIndex + 1).trim();
    const url = `${protocol}:${urlPart}`;

    if (!url || !keyword) return null;

    return { url, keyword };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const lines = urlKeywordsText.split("\n");
    const pairs: UrlKeywordPair[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const pair = parseUrlKeyword(line);
      if (!pair) {
        alert(`Satır ${i + 1}: Geçersiz format.\n\nDoğru format: https://site.com:anahtar kelime`);
        return;
      }
      pairs.push(pair);
    }

    if (pairs.length === 0) {
      alert("En az bir URL:KELIME girmelisiniz");
      return;
    }

    onGenerate({
      urlKeywordPairs: pairs,
      brand,
      description,
      language,
      contentType,
      wordCount: parseInt(wordCount),
      totalCount: parseInt(totalCount),
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Geri Bağlantı İçerik Oluşturucu</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>URL:KELIME Listesi</Label>
              {lineCount > 0 && (
                <span className="text-xs bg-primary/10 px-2 py-1 rounded">
                  {lineCount} adet
                </span>
              )}
            </div>
            <Textarea
              placeholder="Her satıra bir tane yazın:&#10;https://site1.com:anahtar kelime 1&#10;https://site2.com:anahtar kelime 2&#10;https://site3.com:anahtar kelime 3"
              value={urlKeywordsText}
              onChange={(e) => setUrlKeywordsText(e.target.value)}
              rows={5}
              className="font-mono text-sm"
              required
            />
            <p className="text-sm text-muted-foreground">
              Her satır için <strong>{totalCount}</strong> adet içerik üretilir
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Marka Adı</Label>
            <Input
              id="brand"
              placeholder="Marka veya işletme adı"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              (Büyük/küçük harf duyarlıdır. Örn: "Acme Ltd" şeklinde doğru yazın)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">İşletme Tanımı</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoDescribe}
                disabled={isDescribing || !urlKeywordsText.trim()}
              >
                {isDescribing ? "Analiz ediliyor..." : "URL'den Oluştur"}
              </Button>
            </div>
            <Textarea
              id="description"
              placeholder="İşletmenizi kısaca tanımlayın veya URL'den otomatik oluşturun..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Dil</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Dil seçin" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contentType">İçerik Türü</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue placeholder="İçerik türü seçin" />
              </SelectTrigger>
              <SelectContent>
                {contentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wordCount">Kelime Sayısı</Label>
              <Select value={wordCount} onValueChange={setWordCount}>
                <SelectTrigger>
                  <SelectValue placeholder="Kelime sayısı" />
                </SelectTrigger>
                <SelectContent>
                  {wordCounts.map((wc) => (
                    <SelectItem key={wc.value} value={wc.value}>
                      {wc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalCount">Her Biri İçin Adet</Label>
              <Select value={totalCount} onValueChange={setTotalCount}>
                <SelectTrigger>
                  <SelectValue placeholder="Kaç adet?" />
                </SelectTrigger>
                <SelectContent>
                  {totalCounts.map((count) => (
                    <SelectItem key={count} value={count.toString()}>
                      {count} adet
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {lineCount > 0 ? `${lineCount} URL × ${totalCount} adet = Toplam ${lineCount * parseInt(totalCount)} içerik üretilecek` : "URL:KELIME listesi girin"}
          </p>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "İçerik Oluşturuluyor..." : "İçerik Oluştur"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
