"use client";

import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import {
  type ValidationReport,
  type RuleViolation,
  CATEGORY_LABELS,
} from "@/lib/rule-engine";

interface ValidationPanelProps {
  report: ValidationReport;
}

export function ValidationPanel({ report }: ValidationPanelProps) {
  const [expanded, setExpanded] = useState(true);

  // Semua aturan lulus
  if (report.violations.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-[rgba(5,150,105,0.07)] border border-[rgba(5,150,105,0.2)]">
        <ShieldCheck className="w-4 h-4 text-[#059669] flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-[#059669]">
            Semua Validasi Lulus
          </p>
          <p className="text-[11px] text-[#78716C] mt-0.5">
            {report.totalRules} aturan diperiksa — tidak ada pelanggaran
          </p>
        </div>
      </div>
    );
  }

  // Kelompokkan violations berdasarkan kategori
  const byCategory = report.violations.reduce<
    Record<string, RuleViolation[]>
  >((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {});

  return (
    <div className="border border-[rgba(168,162,158,0.1)]">
      {/* Header / Summary */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#1C1C1F] hover:bg-[rgba(217,119,6,0.03)] transition-colors duration-150"
      >
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-[0.06em] font-medium text-[#78716C]">
            Hasil Validasi RBSE
          </span>
          <div className="flex items-center gap-3">
            {report.errorCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-[#DC2626]">
                <AlertCircle className="w-3 h-3" />
                {report.errorCount} Error
              </span>
            )}
            {report.warningCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-[#D97706]">
                <AlertTriangle className="w-3 h-3" />
                {report.warningCount} Warning
              </span>
            )}
            {report.infoCount > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-[#78716C]">
                <Info className="w-3 h-3" />
                {report.infoCount} Info
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#78716C]">
            <span className="text-[#059669]">{report.passedCount}</span>
            /{report.totalRules} lulus
          </span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-[#78716C]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-[#78716C]" />
          )}
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-[2px] bg-[rgba(168,162,158,0.1)]">
        <div
          className="h-full bg-[#059669] transition-all duration-500"
          style={{
            width: `${(report.passedCount / report.totalRules) * 100}%`,
          }}
        />
      </div>

      {/* Detail violations */}
      {expanded && (
        <div className="divide-y divide-[rgba(168,162,158,0.08)]">
          {Object.entries(byCategory).map(([category, violations]) => (
            <div key={category}>
              {/* Category header */}
              <div className="px-4 py-2 bg-[rgba(168,162,158,0.04)]">
                <span className="text-[10px] uppercase tracking-[0.07em] font-medium text-[#78716C]">
                  {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ??
                    category}
                </span>
              </div>

              {/* Violation rows */}
              {violations.map((v) => (
                <ViolationRow key={v.ruleId} violation={v} />
              ))}
            </div>
          ))}

          {/* Footer — passing rules summary */}
          <div className="px-4 py-2.5 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
            <span className="text-[11px] text-[#78716C]">
              {report.passedCount} aturan lulus dari total {report.totalRules}{" "}
              aturan yang diperiksa
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Violation Row
// ─────────────────────────────────────────────────────────────────────────────

function ViolationRow({ violation: v }: { violation: RuleViolation }) {
  const config = {
    error: {
      Icon: AlertCircle,
      textColor: "text-[#DC2626]",
      bg: "bg-[rgba(220,38,38,0.04)]",
      badgeBg: "bg-[rgba(220,38,38,0.1)] text-[#DC2626]",
      label: "Error",
    },
    warning: {
      Icon: AlertTriangle,
      textColor: "text-[#D97706]",
      bg: "bg-[rgba(217,119,6,0.03)]",
      badgeBg: "bg-[rgba(217,119,6,0.1)] text-[#D97706]",
      label: "Warning",
    },
    info: {
      Icon: Info,
      textColor: "text-[#78716C]",
      bg: "",
      badgeBg: "bg-[rgba(168,162,158,0.1)] text-[#78716C]",
      label: "Info",
    },
  }[v.severity];

  const { Icon } = config;

  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${config.bg}`}>
      <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${config.textColor}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] font-medium text-[#78716C]"
            style={{ fontFamily: "var(--font-jetbrains)" }}
          >
            {v.ruleId}
          </span>
          <span className="text-xs font-medium text-[#F5F5F4]">
            {v.ruleName}
          </span>
          <span
            className={`text-[9px] px-1.5 py-0.5 uppercase tracking-[0.05em] font-medium ${config.badgeBg}`}
          >
            {config.label}
          </span>
        </div>
        <p className="text-[11px] text-[#A8A29E] mt-1">{v.message}</p>
        <p className="text-[10px] text-[#78716C] mt-0.5 italic">
          {v.description}
        </p>
      </div>
    </div>
  );
}
