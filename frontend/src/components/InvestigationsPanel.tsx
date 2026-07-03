"use client"

import { useEffect, useState, useCallback } from "react"
import {
  ClipboardList, RefreshCw, CheckCircle2, Loader2, XCircle, Clock, AlertTriangle
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { InvestigationSummary } from "@/types"

interface InvestigationsPanelProps {
  onViewReport: (investigationId: string) => void
}

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: <Clock className="w-3.5 h-3.5" />, class: "text-[#4d6a91] bg-[rgba(15,26,46,0.6)] border-[rgba(99,155,255,0.1)]" },
  running: { label: "Running", icon: <Loader2 className="w-3.5 h-3.5 spin" />, class: "text-blue-400 bg-blue-500/10 border-blue-500/20 status-running" },
  completed: { label: "Completed", icon: <CheckCircle2 className="w-3.5 h-3.5" />, class: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  failed: { label: "Failed", icon: <XCircle className="w-3.5 h-3.5" />, class: "text-red-400 bg-red-500/10 border-red-500/20" },
}

export default function InvestigationsPanel({ onViewReport }: InvestigationsPanelProps) {
  const [investigations, setInvestigations] = useState<InvestigationSummary[]>([])
  const [stats, setStats] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [invData, statsData] = await Promise.allSettled([
        api.investigations.list({ limit: 100, status: statusFilter || undefined }),
        api.investigations.stats(),
      ])
      if (invData.status === "fulfilled") setInvestigations(invData.value)
      if (statsData.status === "fulfilled") setStats(statsData.value)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh if any are running
  useEffect(() => {
    if (!autoRefresh) return
    const hasRunning = investigations.some(i => i.status === "pending" || i.status === "running")
    if (!hasRunning) return
    const interval = setInterval(fetchData, 4000)
    return () => clearInterval(interval)
  }, [autoRefresh, investigations, fetchData])

  const formatDuration = (started: string, completed: string | null) => {
    if (!completed) return "In progress..."
    const ms = new Date(completed).getTime() - new Date(started).getTime()
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#e8f0fe]">Investigation History</h2>
          <p className="text-base text-[#4d6a91] mt-0.5">All LangGraph agent runs</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(a => !a)}
            className={cn(
              "text-sm px-3 py-1.5 rounded-lg border transition-all",
              autoRefresh
                ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                : "border-[rgba(99,155,255,0.12)] text-[#4d6a91]"
            )}
          >
            {autoRefresh ? "● Auto" : "○ Manual"}
          </button>
          <button onClick={() => { setLoading(true); fetchData() }} className="btn-secondary text-sm py-1.5">
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total_investigations, color: "text-[#e8f0fe]" },
            { label: "Completed", value: stats.completed, color: "text-emerald-400" },
            { label: "Running", value: stats.running, color: "text-blue-400" },
            { label: "Anomalies Found", value: stats.anomalies_detected, color: "text-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card p-4 border border-[rgba(99,155,255,0.1)] text-center">
              <div className={cn("text-2xl font-bold tabular-nums", color)}>{value}</div>
              <div className="text-sm text-[#4d6a91] mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 flex-wrap">
        {[null, "completed", "running", "pending", "failed"].map(status => (
          <button
            key={status ?? "all"}
            onClick={() => setStatusFilter(status)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
              statusFilter === status
                ? "bg-blue-500/15 border-blue-500/30 text-blue-300"
                : "border-[rgba(99,155,255,0.1)] text-[#4d6a91] hover:border-[rgba(99,155,255,0.25)]"
            )}
          >
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card border border-[rgba(99,155,255,0.1)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-[rgba(99,155,255,0.08)]">
                <th className="px-5 py-3.5 text-left text-sm font-medium text-[#4d6a91] uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-left text-sm font-medium text-[#4d6a91] uppercase tracking-wider">Transaction</th>
                <th className="px-5 py-3.5 text-left text-sm font-medium text-[#4d6a91] uppercase tracking-wider">Anomaly Score</th>
                <th className="px-5 py-3.5 text-left text-sm font-medium text-[#4d6a91] uppercase tracking-wider">Confidence</th>
                <th className="px-5 py-3.5 text-left text-sm font-medium text-[#4d6a91] uppercase tracking-wider">Duration</th>
                <th className="px-5 py-3.5 text-left text-sm font-medium text-[#4d6a91] uppercase tracking-wider">Started</th>
                <th className="px-5 py-3.5 text-right text-sm font-medium text-[#4d6a91] uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[rgba(99,155,255,0.06)]">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : investigations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <ClipboardList className="w-10 h-10 text-[#2d4566]" />
                      <p className="text-[#4d6a91] text-base">No investigations yet</p>
                      <p className="text-sm text-[#2d4566]">Click "Investigate" on any transaction to start</p>
                    </div>
                  </td>
                </tr>
              ) : (
                investigations.map(inv => {
                  const statusCfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending
                  return (
                    <tr key={inv.id} className="table-row-hover border-b border-[rgba(99,155,255,0.06)] last:border-0">
                      <td className="px-5 py-4">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border", statusCfg.class)}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="mono text-sm text-[#8ba8d4]">{inv.transaction_id.slice(0, 8)}...</div>
                        <div className="text-sm text-[#4d6a91] mt-0.5 mono">{inv.account_id}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[rgba(15,26,46,0.8)] rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full score-bar",
                                inv.anomaly_score >= 0.7 ? "bg-gradient-to-r from-red-500 to-red-400" :
                                  inv.anomaly_score >= 0.4 ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                                    "bg-gradient-to-r from-emerald-500 to-emerald-400"
                              )}
                              style={{ width: `${Math.max(inv.anomaly_score * 100, 2)}%` }}
                            />
                          </div>
                          <span className={cn("text-sm font-semibold tabular-nums",
                            inv.anomaly_score >= 0.7 ? "text-red-400" :
                              inv.anomaly_score >= 0.4 ? "text-amber-400" : "text-emerald-400"
                          )}>
                            {(inv.anomaly_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-blue-400 tabular-nums">
                          {(inv.confidence_score * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-[#4d6a91] tabular-nums">
                          {formatDuration(inv.started_at, inv.completed_at)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-[#4d6a91]">
                          {new Date(inv.started_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {inv.status === "completed" && (
                          <button
                            onClick={() => onViewReport(inv.id)}
                            className="text-sm px-3 py-1.5 rounded-lg border border-[rgba(59,130,246,0.2)] text-blue-400 hover:bg-blue-500/10 transition-all"
                          >
                            View Report
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
