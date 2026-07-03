"use client"

import { useEffect, useCallback, useRef } from "react"
import {
  ChevronLeft, FileText, RefreshCw, CheckCircle2, AlertCircle,
  AlertTriangle, Shield, Brain, Database, Cpu, FileSearch, Zap, Globe, TrendingUp
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { InvestigationDetails, Transaction } from "@/types"
import { cn } from "@/lib/utils"

interface ReportViewerProps {
  investigation: InvestigationDetails | null
  transaction: Transaction
  onBack: () => void
  onRefresh: () => void
}

const PIPELINE_STEPS = [
  { key: "detector", label: "Anomaly Detector", icon: <Shield className="w-4 h-4" />, desc: "Statistical + LLM scoring" },
  { key: "retriever", label: "Data Retriever", icon: <Database className="w-4 h-4" />, desc: "Pinecone RAG retrieval" },
  { key: "analyzer", label: "Root Cause Analyzer", icon: <Brain className="w-4 h-4" />, desc: "Historical pattern analysis" },
  { key: "reflection", label: "Reflection Loop", icon: <Cpu className="w-4 h-4" />, desc: "Quality self-assessment" },
  { key: "reporter", label: "Report Generator", icon: <FileSearch className="w-4 h-4" />, desc: "Final investigation report" },
]

function getPipelineStep(status: string | undefined, rerunCount: number) {
  if (!status || status === "pending") return 0
  if (status === "running") return Math.min(rerunCount + 1, 4)
  if (status === "completed" || status === "failed") return 5
  return 0
}

const RISK_COLORS = {
  critical: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", badge: "risk-critical" },
  high: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", badge: "risk-high" },
  medium: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", badge: "risk-medium" },
  low: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", badge: "risk-low" },
}

const FLAG_LABELS: Record<string, { label: string; color: string }> = {
  large_amount: { label: "Large Amount", color: "text-red-400 bg-red-500/10 border-red-500/20" },
  unusual_location: { label: "Unusual Location", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  high_velocity: { label: "High Velocity", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  geo_anomaly: { label: "Geo Anomaly", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  spending_deviation: { label: "Spending Deviation", color: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
  card_not_present: { label: "Card Not Present", color: "text-red-400 bg-red-500/10 border-red-500/20" },
  high_amount_transfer: { label: "High Amount Transfer", color: "text-red-400 bg-red-500/10 border-red-500/20" },
  rapid_withdrawals: { label: "Rapid Withdrawals", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  unusual_time: { label: "Unusual Time", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  new_merchant: { label: "New Merchant", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
}

export default function ReportViewer({ investigation, transaction, onBack, onRefresh }: ReportViewerProps) {
  const isPending = !investigation || investigation.status === "pending" || investigation.status === "running"
  const isFailed = investigation?.status === "failed"
  const activeStep = getPipelineStep(investigation?.status, investigation?.rerun_count ?? 0)

  const riskLevel = (investigation?.risk_level as keyof typeof RISK_COLORS) || "low"
  const riskConfig = RISK_COLORS[riskLevel] || RISK_COLORS.low

  const refreshRef = useRef(onRefresh)
  useEffect(() => {
    refreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPending) {
      interval = setInterval(() => {
        refreshRef.current()
      }, 3000)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [isPending])

  const formatCurrency = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount)
    } catch {
      return `$${amount.toFixed(2)}`
    }
  }

  return (
    <div className="glass-card overflow-hidden flex flex-col" style={{ minHeight: "calc(100vh - 8rem)" }}>
      {/* Header */}
      <div className="p-5 border-b border-[rgba(99,155,255,0.12)] flex items-center justify-between flex-wrap gap-4 bg-[rgba(9,15,28,0.5)]">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg border border-[rgba(99,155,255,0.12)] text-[#4d6a91] hover:border-[rgba(99,155,255,0.3)] hover:text-[#8ba8d4] transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-[#e8f0fe] flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Investigation Report
            </h2>
            <p className="text-sm mono text-[#4d6a91] mt-0.5">
              TxID: {transaction.id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Risk & Score badges */}
          {!isPending && investigation && (
            <div className="flex items-center gap-2">
              <span className={cn("px-3 py-1.5 rounded-full text-sm font-semibold border", riskConfig.badge)}>
                {investigation.risk_level?.toUpperCase() || "UNKNOWN"} RISK
              </span>
              <span className={cn(
                "px-3 py-1.5 rounded-full text-sm font-semibold border",
                investigation.anomaly_score >= 0.7 ? "bg-red-500/10 border-red-500/30 text-red-400" :
                investigation.anomaly_score >= 0.4 ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              )}>
                SCORE: {(investigation.anomaly_score * 100).toFixed(1)}%
              </span>
            </div>
          )}

          {isPending ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-base font-medium status-running">
              <RefreshCw className="w-4 h-4 spin" />
              Agent Analyzing...
            </div>
          ) : isFailed ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-base font-medium">
              <AlertTriangle className="w-4 h-4" />
              Analysis Failed
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-base font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Analysis Complete
            </div>
          )}

          <button
            onClick={onRefresh}
            className="p-2 rounded-lg border border-[rgba(99,155,255,0.12)] text-[#4d6a91] hover:border-[rgba(99,155,255,0.3)] hover:text-[#8ba8d4] transition-all"
            title="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", isPending && "spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Left Column ─────────────────────────────────────────── */}
          <div className="w-full lg:w-80 space-y-5 flex-shrink-0">
            {/* Transaction Context */}
            <div className="glass-card p-5 border border-[rgba(99,155,255,0.1)]">
              <h3 className="text-sm font-semibold text-[#4d6a91] uppercase tracking-wider mb-4">
                Transaction Context
              </h3>
              <div className="space-y-3 text-base">
                {[
                  { label: "Amount", value: formatCurrency(transaction.amount, transaction.currency) },
                  { label: "Account", value: transaction.account_id, mono: true },
                  { label: "Merchant", value: transaction.merchant || "Unknown" },
                  { label: "Location", value: transaction.location || "Unknown" },
                  { label: "Type", value: transaction.transaction_type },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex justify-between items-start gap-2">
                    <span className="text-[#4d6a91] flex-shrink-0">{label}</span>
                    <span className={cn("font-medium text-[#e8f0fe] text-right", mono && "mono text-sm text-[#8ba8d4]")}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Dataset signals */}
              {(transaction.velocity_score != null || transaction.geo_anomaly_score != null) && (
                <div className="mt-4 pt-4 border-t border-[rgba(99,155,255,0.08)] space-y-2">
                  <p className="text-sm font-semibold text-[#4d6a91] uppercase tracking-wider">Risk Signals</p>
                  {transaction.velocity_score != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#4d6a91] flex items-center gap-1"><Zap className="w-3 h-3" /> Velocity</span>
                      <span className={cn("font-medium",
                        transaction.velocity_score >= 8 ? "text-red-400" :
                          transaction.velocity_score >= 5 ? "text-amber-400" : "text-emerald-400"
                      )}>
                        {transaction.velocity_score}/10
                      </span>
                    </div>
                  )}
                  {transaction.geo_anomaly_score != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#4d6a91] flex items-center gap-1"><Globe className="w-3 h-3" /> Geo Anomaly</span>
                      <span className={cn("font-medium",
                        transaction.geo_anomaly_score >= 0.85 ? "text-red-400" :
                          transaction.geo_anomaly_score >= 0.6 ? "text-amber-400" : "text-emerald-400"
                      )}>
                        {(transaction.geo_anomaly_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                  {transaction.spending_deviation != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#4d6a91] flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Deviation</span>
                      <span className={cn("font-medium",
                        Math.abs(transaction.spending_deviation) > 2 ? "text-amber-400" : "text-emerald-400"
                      )}>
                        {transaction.spending_deviation > 0 ? "+" : ""}{transaction.spending_deviation.toFixed(2)}σ
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Agent Pipeline Visualizer */}
            <div className="glass-card p-5 border border-[rgba(99,155,255,0.1)]">
              <h3 className="text-sm font-semibold text-[#4d6a91] uppercase tracking-wider mb-4">
                Agent Pipeline
              </h3>
              <div className="space-y-3">
                {PIPELINE_STEPS.map((step, i) => {
                  const isDone = i < activeStep
                  const isActive = i === activeStep - 1 && isPending
                  const isPipelinePending = i >= activeStep
                  return (
                    <div key={step.key} className="flex items-start gap-3">
                      <div className={cn(
                        "w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5",
                        isDone ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" :
                          isActive ? "bg-blue-500/20 border-blue-500/40 text-blue-400" :
                            "bg-[rgba(15,26,46,0.6)] border-[rgba(99,155,255,0.1)] text-[#2d4566]"
                      )}>
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isActive ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full spin" />
                        ) : (
                          step.icon
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "text-base font-medium",
                          isDone ? "pipeline-step-done" :
                            isActive ? "pipeline-step-active" :
                              "pipeline-step-pending"
                        )}>
                          {step.label}
                        </div>
                        <div className="text-sm text-[#2d4566]">{step.desc}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Metrics (shown after completion) */}
            {!isPending && investigation && (
              <div className="glass-card p-5 border border-[rgba(99,155,255,0.1)]">
                <h3 className="text-sm font-semibold text-[#4d6a91] uppercase tracking-wider mb-4">
                  Agent Metrics
                </h3>
                <div className="space-y-4">
                  {[
                    {
                      label: "Anomaly Score",
                      value: investigation.anomaly_score,
                      color: investigation.anomaly_score >= 0.7 ? "from-red-500 to-red-400" :
                        investigation.anomaly_score >= 0.4 ? "from-amber-500 to-amber-400" :
                          "from-emerald-500 to-emerald-400",
                      textColor: investigation.anomaly_score >= 0.7 ? "text-red-400" :
                        investigation.anomaly_score >= 0.4 ? "text-amber-400" : "text-emerald-400",
                    },
                    {
                      label: "Agent Confidence",
                      value: investigation.confidence_score,
                      color: "from-blue-500 to-cyan-400",
                      textColor: "text-blue-400",
                    },
                  ].map(({ label, value, color, textColor }) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#4d6a91]">{label}</span>
                        <span className={cn("font-semibold", textColor)}>{(value * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-2 bg-[rgba(15,26,46,0.8)] rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full bg-gradient-to-r score-bar", color)}
                          style={{ width: `${Math.max(value * 100, 2)}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="pt-3 border-t border-[rgba(99,155,255,0.08)] flex justify-between text-sm">
                    <span className="text-[#4d6a91]">Reflection Loops</span>
                    <span className="text-[#8ba8d4] font-medium">
                      {investigation.rerun_count} {investigation.rerun_count === 1 ? "retry" : "retries"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Similar Cases */}
            {!isPending && investigation?.similar_cases && investigation.similar_cases.length > 0 && (
              <div className="glass-card p-5 border border-[rgba(99,155,255,0.1)]">
                <h3 className="text-sm font-semibold text-[#4d6a91] uppercase tracking-wider mb-4">
                  Similar Cases (RAG)
                </h3>
                <div className="space-y-3">
                  {investigation.similar_cases.slice(0, 4).map((c: any, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded bg-[rgba(59,130,246,0.1)] flex items-center justify-center text-sm text-blue-400 flex-shrink-0 font-mono">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0 text-sm">
                        <div className="text-[#8ba8d4]">
                          {c.metadata?.merchant_category || c.metadata?.merchant || "Unknown"} ·{" "}
                          {c.metadata?.location || "—"}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[#4d6a91]">Match:</span>
                          <span className="text-blue-400 font-medium">
                            {(c.score * 100).toFixed(0)}%
                          </span>
                          {c.metadata?.outcome && (
                            <span className={cn(
                              "text-sm px-1.5 py-0.5 rounded",
                              c.metadata.outcome === "confirmed_fraud"
                                ? "text-red-400 bg-red-500/10"
                                : "text-amber-400 bg-amber-500/10"
                            )}>
                              {c.metadata.outcome.replace("_", " ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column: AI Report ──────────────────────────────── */}
          <div className="flex-1 space-y-5 min-w-0">
            {isPending ? (
              <div className="glass-card p-12 flex flex-col items-center justify-center text-center border border-[rgba(99,155,255,0.1)]">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 pulse-ring">
                  <Brain className="w-8 h-8 text-blue-400 spin" />
                </div>
                <h3 className="text-xl font-semibold text-[#e8f0fe] mb-2">Agent is Investigating</h3>
                <p className="text-[#4d6a91] max-w-md text-base leading-relaxed">
                  The LangGraph agent is analyzing {transaction.merchant} transaction of{" "}
                  {formatCurrency(transaction.amount, transaction.currency)}, retrieving historical fraud
                  patterns from Pinecone, and generating a comprehensive report via Groq LLaMA 3.3.
                </p>

                <div className="mt-8 w-full max-w-xs space-y-3 text-base text-left">
                  {PIPELINE_STEPS.map((step, i) => (
                    <div key={step.key} className={cn(
                      "flex items-center gap-3",
                      i < activeStep ? "pipeline-step-done" :
                        i === activeStep - 1 ? "pipeline-step-active" :
                          "pipeline-step-pending"
                    )}>
                      {i < activeStep ? (
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      ) : i === activeStep - 1 ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full spin flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 flex-shrink-0 opacity-30" />
                      )}
                      <span>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Anomaly Flags */}
                {investigation?.anomaly_flags && investigation.anomaly_flags.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-[#4d6a91] uppercase tracking-wider mb-3">
                      Detected Anomaly Flags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {investigation.anomaly_flags.map(flag => {
                        const cfg = FLAG_LABELS[flag]
                        return (
                          <span
                            key={flag}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-sm font-medium border",
                              cfg?.color || "text-[#8ba8d4] bg-[rgba(15,26,46,0.6)] border-[rgba(99,155,255,0.15)]"
                            )}
                          >
                            {cfg?.label || flag.replace(/_/g, " ")}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Root Cause */}
                {investigation?.root_cause && (
                  <div className={cn("p-5 rounded-xl border", riskConfig.bg, riskConfig.border)}>
                    <h3 className={cn("text-base font-semibold uppercase tracking-wider mb-2 flex items-center gap-2", riskConfig.text)}>
                      <AlertTriangle className="w-4 h-4" /> Root Cause Analysis
                    </h3>
                    <p className="text-[#8ba8d4] text-base leading-relaxed">{investigation.root_cause}</p>
                  </div>
                )}

                {/* Final Report */}
                <div className="glass-card p-6 border border-[rgba(99,155,255,0.1)]">
                  <div className="report-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {investigation?.final_report || "No report generated."}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Recommended Actions */}
                {investigation?.recommended_actions && investigation.recommended_actions.length > 0 && (
                  <div className="glass-card p-5 border border-[rgba(59,130,246,0.15)] bg-blue-500/5">
                    <h3 className="text-base font-semibold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Recommended Actions
                    </h3>
                    <ul className="space-y-3">
                      {investigation.recommended_actions.map((action, i) => (
                        <li key={i} className="flex items-start gap-3 text-base">
                          <span className="w-5 h-5 rounded-full bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-sm text-blue-400 font-semibold flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-[#8ba8d4] leading-relaxed">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Export hint */}
                <div className="text-center pt-2">
                  <button
                    onClick={() => window.print()}
                    className="text-sm text-[#4d6a91] hover:text-[#8ba8d4] underline transition-colors"
                  >
                    Export / Print Report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
