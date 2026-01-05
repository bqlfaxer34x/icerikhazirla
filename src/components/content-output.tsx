"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ContentItem {
  id: string;
  content: string;
  type: string;
}

interface ContentOutputProps {
  items: ContentItem[];
  onDeleteItem: (id: string) => void;
  title: string;
}

export function ContentOutput({ items, onDeleteItem, title }: ContentOutputProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="space-y-3">
        {items.map((item, index) => (
          <Card key={item.id} className="relative">
            <CardContent className="pt-4 pb-4 pr-32">
              <div className="text-xs text-muted-foreground mb-2">
                #{index + 1}
              </div>
              <div
                className="content-display prose prose-sm max-w-none whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
              <div className="absolute top-3 right-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(item.content, item.id)}
                >
                  {copiedId === item.id ? "Kopyalandı!" : "Kopyala"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDeleteItem(item.id)}
                >
                  Sil
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
