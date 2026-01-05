"use client";

import { useState, useEffect } from "react";
import { ContentForm, FormData } from "@/components/content-form";
import { ContentOutput } from "@/components/content-output";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface ContentItem {
  id: string;
  content: string;
  type: string;
  groupId: string;
}

interface ContentGroup {
  id: string;
  url: string;
  keyword: string;
  contentType: string;
  items: ContentItem[];
}

interface ProgressInfo {
  currentPair: number;
  totalPairs: number;
  currentKeyword: string;
  completed: number;
  total: number;
}

const contentTypeLabels: Record<string, string> = {
  forum: "Forum / Yorum İçerikleri",
  bio: "Profil / Bio Metinleri",
  article: "Makale Paragrafları",
  social: "Sosyal Medya Paylaşımları",
};

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<ContentGroup[]>([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentKeyword, setCurrentKeyword] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [singleBlockMode, setSingleBlockMode] = useState(false);
  const [singleBlockContent, setSingleBlockContent] = useState("");

  // Chrome sekmesinde keyword göster
  useEffect(() => {
    if (currentKeyword) {
      document.title = `${currentKeyword} | İçerik Oluşturucu`;
    } else {
      document.title = "Geri Bağlantı İçerik Oluşturucu";
    }
  }, [currentKeyword]);

  const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleGenerate = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    setSingleBlockMode(formData.singleBlockMode);

    if (formData.singleBlockMode) {
      setSingleBlockContent("");
    }

    const BATCH_SIZE = 10;
    const totalCount = formData.totalCount;
    const pairs = formData.urlKeywordPairs;
    const totalPairs = pairs.length;

    try {
      // Her URL:KELIME çifti için sırayla üretim yap
      for (let pairIndex = 0; pairIndex < totalPairs; pairIndex++) {
        const pair = pairs[pairIndex];
        setCurrentKeyword(pair.keyword);

        // Aynı URL ve keyword ile mevcut grup var mı kontrol et
        let currentGroups = groups;
        // State güncellemelerini senkronize almak için fonksiyon kullan
        setGroups(prev => {
          currentGroups = prev;
          return prev;
        });

        const existingGroupIndex = currentGroups.findIndex(
          g => g.url === pair.url && g.keyword === pair.keyword
        );

        let groupId: string;

        if (existingGroupIndex !== -1) {
          // Mevcut gruba ekle
          groupId = currentGroups[existingGroupIndex].id;
          setActiveGroupIndex(existingGroupIndex);
        } else {
          // Yeni grup oluştur
          groupId = generateUniqueId();
          const newGroup: ContentGroup = {
            id: groupId,
            url: pair.url,
            keyword: pair.keyword,
            contentType: formData.contentType,
            items: [],
          };

          setGroups(prev => {
            const newGroups = [...prev, newGroup];
            setActiveGroupIndex(newGroups.length - 1);
            return newGroups;
          });
        }

        // Batch'ler halinde içerik üret
        const batches = Math.ceil(totalCount / BATCH_SIZE);

        for (let i = 0; i < batches; i++) {
          const currentBatchSize = Math.min(BATCH_SIZE, totalCount - (i * BATCH_SIZE));
          const completed = i * BATCH_SIZE;

          setProgress({
            currentPair: pairIndex + 1,
            totalPairs,
            currentKeyword: pair.keyword,
            completed,
            total: totalCount,
          });

          const response = await fetch("/api/generate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: pair.url,
              keyword: pair.keyword,
              brand: formData.brand,
              description: formData.description,
              language: formData.language,
              contentType: formData.contentType,
              wordCount: formData.wordCount,
              batchSize: currentBatchSize,
            }),
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || "Bir hata oluştu");
          }

          // Yeni içerikleri işle
          if (formData.singleBlockMode) {
            // Tek parça modunda: içerikleri text olarak birleştir
            const newContent = result.data.items.map((content: string) => {
              // HTML linklerini plain text'e çevir ama linki koru
              return content
                .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
                .replace(/<[^>]+>/g, '');
            }).join("\n\n");

            setSingleBlockContent(prev => prev + (prev ? "\n\n" : "") + newContent);
          } else {
            // Normal mod: kartlar halinde göster
            const newItems: ContentItem[] = result.data.items.map((content: string) => ({
              id: generateUniqueId(),
              content,
              type: formData.contentType,
              groupId,
            }));

            // Gruba yeni içerikleri ekle
            setGroups(prev => prev.map(g =>
              g.id === groupId
                ? { ...g, items: [...g.items, ...newItems] }
                : g
            ));
          }

          // İlerleme güncelle
          const newCompleted = (i + 1) * BATCH_SIZE;
          setProgress({
            currentPair: pairIndex + 1,
            totalPairs,
            currentKeyword: pair.keyword,
            completed: Math.min(newCompleted, totalCount),
            total: totalCount,
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setIsLoading(false);
      setProgress(null);
      setCurrentKeyword(null);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    setGroups(prev => prev.map(g => ({
      ...g,
      items: g.items.filter(item => item.id !== itemId)
    })).filter(g => g.items.length > 0));

    // Eğer aktif grup silindiyse, önceki gruba geç
    if (groups.length > 0 && activeGroupIndex >= groups.length - 1) {
      setActiveGroupIndex(Math.max(0, activeGroupIndex - 1));
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    if (confirm("Bu gruptaki tüm içerikler silinecek. Emin misiniz?")) {
      const newGroups = groups.filter(g => g.id !== groupId);
      setGroups(newGroups);

      if (activeGroupIndex >= newGroups.length) {
        setActiveGroupIndex(Math.max(0, newGroups.length - 1));
      }
    }
  };

  const handleClearAll = () => {
    if (confirm("Tüm içerikler silinecek. Emin misiniz?")) {
      setGroups([]);
      setActiveGroupIndex(0);
    }
  };

  const handleDownloadWord = () => {
    const allItems = groups.flatMap(g => g.items);
    if (allItems.length === 0) return;

    // HTML formatında Word belgesi oluştur (linkler tıklanabilir olacak)
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; }
  .group-header { font-weight: bold; font-size: 14pt; margin-top: 20px; border-bottom: 2px solid #333; padding-bottom: 5px; }
  .group-type { font-size: 11pt; color: #666; margin-bottom: 15px; }
  .content-item { margin-bottom: 24px; }
  a { color: #0066cc; text-decoration: underline; }
</style>
</head>
<body>
`;

    groups.forEach((group, gIndex) => {
      const typeLabel = contentTypeLabels[group.contentType] || "İçerikler";

      htmlContent += `<div class="group-header">${group.keyword} - ${group.url}</div>`;
      htmlContent += `<div class="group-type">Tür: ${typeLabel}</div>`;

      group.items.forEach((item) => {
        // İçeriği olduğu gibi ekle (HTML linkler korunacak)
        htmlContent += `<div class="content-item">${item.content}</div>`;
      });

      if (gIndex < groups.length - 1) {
        htmlContent += `<hr style="margin: 30px 0;">`;
      }
    });

    htmlContent += `</body></html>`;

    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icerikler_${new Date().toISOString().slice(0,10)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeGroup = groups[activeGroupIndex];
  const totalItemCount = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Geri Bağlantı İçerik Oluşturucu
          </h1>
          <p className="text-muted-foreground">
            SEO geri bağlantılarınız için hazır içerikler oluşturun
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
          <aside>
            <ContentForm onGenerate={handleGenerate} isLoading={isLoading} />
          </aside>

          <main>
            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="ml-4 text-destructive hover:text-destructive/80 font-bold text-lg"
                >
                  ×
                </button>
              </div>
            )}

            {/* İlerleme durumu */}
            {progress && (
              <div className="bg-primary/10 border border-primary text-primary px-4 py-3 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">
                    URL {progress.currentPair}/{progress.totalPairs}: {progress.currentKeyword}
                  </span>
                  <span>{progress.completed}/{progress.total}</span>
                </div>
                <div className="w-full bg-primary/20 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Üst butonlar */}
            {totalItemCount > 0 && (
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">
                  Toplam: {totalItemCount} içerik ({groups.length} grup)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadWord}
                  >
                    Word İndir
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleClearAll}
                  >
                    Tümünü Sil
                  </Button>
                </div>
              </div>
            )}

            {/* Grup Kartları - Birden fazla grup varsa göster */}
            {groups.length > 1 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveGroupIndex(Math.max(0, activeGroupIndex - 1))}
                    disabled={activeGroupIndex === 0}
                  >
                    ← Önceki
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {activeGroupIndex + 1} / {groups.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveGroupIndex(Math.min(groups.length - 1, activeGroupIndex + 1))}
                    disabled={activeGroupIndex === groups.length - 1}
                  >
                    Sonraki →
                  </Button>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2">
                  {groups.map((group, index) => (
                    <Card
                      key={group.id}
                      className={`cursor-pointer min-w-[200px] transition-all ${
                        index === activeGroupIndex
                          ? 'ring-2 ring-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setActiveGroupIndex(index)}
                    >
                      <CardHeader className="p-3">
                        <CardTitle className="text-sm font-medium truncate">
                          {group.keyword}
                        </CardTitle>
                        <div className="text-xs text-muted-foreground truncate">
                          {group.url}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs bg-primary/10 px-2 py-0.5 rounded">
                            {group.items.length} içerik
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGroup(group.id);
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Tek grup varsa başlık göster */}
            {groups.length === 1 && activeGroup && (
              <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{activeGroup.keyword}</div>
                    <div className="text-sm text-muted-foreground">{activeGroup.url}</div>
                  </div>
                  <span className="text-sm bg-primary/10 px-2 py-1 rounded">
                    {activeGroup.items.length} içerik
                  </span>
                </div>
              </div>
            )}

            {isLoading && groups.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">
                    İçerikler oluşturuluyor, lütfen bekleyin...
                  </p>
                </div>
              </div>
            )}

            {/* Tek Parça Modu */}
            {singleBlockMode && singleBlockContent && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Düzenlenebilir İçerik</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(singleBlockContent);
                      }}
                    >
                      Tümünü Kopyala
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const blob = new Blob([singleBlockContent], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `icerikler_${new Date().toISOString().slice(0,10)}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                    >
                      TXT İndir
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm("Tüm içerik silinecek. Emin misiniz?")) {
                          setSingleBlockContent("");
                        }
                      }}
                    >
                      Temizle
                    </Button>
                  </div>
                </div>
                <textarea
                  value={singleBlockContent}
                  onChange={(e) => setSingleBlockContent(e.target.value)}
                  className="w-full h-[500px] p-4 border rounded-lg font-mono text-sm bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="İçerikler burada görünecek..."
                />
                <p className="text-xs text-muted-foreground">
                  {singleBlockContent.split(/\n\n+/).filter(p => p.trim()).length} paragraf • {singleBlockContent.length} karakter
                </p>
              </div>
            )}

            {/* Normal Mod - Kartlar */}
            {!singleBlockMode && activeGroup && activeGroup.items.length > 0 && (
              <ContentOutput
                items={activeGroup.items}
                onDeleteItem={handleDeleteItem}
                title={contentTypeLabels[activeGroup.contentType] || "İçerikler"}
              />
            )}

            {groups.length === 0 && !singleBlockContent && !isLoading && !error && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <p>
                  Formu doldurup &quot;İçerik Oluştur&quot; butonuna tıklayın
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
