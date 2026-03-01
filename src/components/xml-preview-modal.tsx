"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download, Check, Code2 } from "lucide-react";

interface XmlPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  xml: string;
  filename: string;
  onDownload: () => void;
}

export function XmlPreviewModal({
  open,
  onOpenChange,
  xml,
  filename,
  onDownload,
}: XmlPreviewModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(xml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple XML syntax highlight — tag names copper, attributes muted
  const highlighted = xml
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /(&lt;\/?)([\w:]+)/g,
      (_, bracket, tag) =>
        `<span style="color:#78716C">${bracket}</span><span style="color:#D97706">${tag}</span>`
    )
    .replace(
      /([\w:]+)(=&quot;[^&]*&quot;)/g,
      `<span style="color:#A8A29E">$1</span><span style="color:#059669">$2</span>`
    );

  const lineCount = xml.split("\n").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-[rgba(168,162,158,0.1)] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-sm font-medium text-[#F5F5F4]">
                <Code2 className="w-4 h-4 text-[#D97706]" />
                Preview XML Coretax
              </DialogTitle>
              <p
                className="text-[10px] text-[#78716C] mt-1"
                style={{ fontFamily: "var(--font-jetbrains)" }}
              >
                {filename} · {lineCount} baris · {(xml.length / 1024).toFixed(1)} KB
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5 text-[11px]"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#059669]" />
                    Tersalin
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Salin
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => { onDownload(); onOpenChange(false); }}
                className="gap-1.5 text-[11px]"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* XML content */}
        <div className="flex-1 overflow-auto bg-[#0A0A0B]">
          <div className="flex">
            {/* Line numbers */}
            <div
              className="select-none flex-shrink-0 px-3 py-4 text-right text-[11px] leading-[1.7] text-[rgba(168,162,158,0.25)] border-r border-[rgba(168,162,158,0.08)]"
              style={{ fontFamily: "var(--font-jetbrains)", minWidth: "3rem" }}
            >
              {xml.split("\n").map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            {/* Code */}
            <pre
              className="flex-1 px-4 py-4 text-[11px] leading-[1.7] text-[#A8A29E] overflow-x-auto whitespace-pre"
              style={{ fontFamily: "var(--font-jetbrains)" }}
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
