"use client"

import { useState, useMemo } from "react"
import {
  Search, AlertTriangle, ShieldCheck, Activity, Eye, Trash2,
  ChevronUp, ChevronDown, Filter, Zap, Globe, TrendingUp
} from "lucide-react"
import type { Transaction } from "@/types"
import { cn } from "@/lib/utils"

interface TransactionTableProps {
  transactions: Transaction[]
  onInvestigate: (tx: Transaction) => void
  onDelete?: (id: string) => void
  loadingId?: string | null
}

const RISK_CONFIG = {
  critical: {
    label: "Critical",
    className: "risk-critical",
    icon: <AlertTriangle className="w-4 h-4" />,
    dot: "bg-red-500",
  },
  high: {
    label: "High",
    className: "risk-high",
    icon: <AlertTriangle className="w-4 h-4" />,
    dot: "bg-amber-500",
  },
  medium: {
    label: "Medium",
    className: "risk-medium",
    icon: <Activity className="w-4 h-4" />,
    dot: "bg-blue-500",
  },
  low: {
    label: "Low",
    className: "risk-low",
    icon: <ShieldCheck className="w-4 h-4" />,
    dot: "bg-emerald-500",
  },
}

type SortKey = "timestamp" | "amount" | "anomaly_score"
type SortDir = "asc" | "desc"

export default function TransactionTable({
  transactions,
  onInvestigate,
  onDelete,
  loadingId,
}: TransactionTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [riskFilter, setRiskFilter] = useState<string | null>(null)
  const [anomalyFilter, setAnomalyFilter] = useState<boolean | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("timestamp")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [page, setPage] = useState(1)
  const pageSize = 15

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
    setPage(1)
  }

  const filtered = useMemo(() => {
    let list = transactions

    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      list = list.filter(
        t =>
          t.merchant?.toLowerCase().includes(q) ||
          t.account_id.toLowerCase().includes(q) ||
          t.location?.toLowerCase().includes(q)
      )
    }

    if (riskFilter) list = list.filter(t => t.risk_level === riskFilter)
    if (anomalyFilter !== null) list = list.filter(t => t.is_anomaly === anomalyFilter)

    list = [...list].sort((a, b) => {
      let valA: number, valB: number
      if (sortKey === "timestamp") {
        valA = new Date(a.timestamp).getTime()
        valB = new Date(b.timestamp).getTime()
      } else {
        valA = a[sortKey]
        valB = b[sortKey]
      }
      return sortDir === "asc" ? valA - valB : valB - valA
    })

    return list
  }, [transactions, searchTerm, riskFilter, anomalyFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === "asc" ? (
        <ChevronUp className="w-3 h-3" />
      ) : (
        <ChevronDown className="w-3 h-3" />
      )
    ) : (
      <ChevronDown className="w-3 h-3 opacity-30" />
    )

  const formatCurrency = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
    } catch {
      return `$${amount.toFixed(2)}`
    }
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[rgba(99,155,255,0.12)] flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#e8f0fe]">Transaction Monitor</h2>
          <p className="text-sm text-[#4d6a91] mt-0.5">
            {filtered.length} of {transactions.length} transactions • {transactions.filter(t => t.has_investigation).length} investigated
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4d6a91] w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search account, merchant, location..."
              className="form-input pl-9 w-56 py-2"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
            />
          </div>

          {/* Risk filter pills */}
          <div className="flex gap-1">
            {(["critical", "high", "medium", "low"] as const).map(r => (
              <button
                key={r}
                onClick={() => {
                  setRiskFilter(riskFilter === r ? null : r)
                  setPage(1)
                }}
                className={cn(
                  "px-2.5 py-1 rounded-full text-sm font-medium transition-all",
                  riskFilter === r
                    ? RISK_CONFIG[r].className
                    : "bg-[rgba(15,26,46,0.6)] text-[#4d6a91] border border-[rgba(99,155,255,0.1)] hover:border-[rgba(99,155,255,0.25)]"
                )}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          {/* Anomaly toggle */}
          <button
            onClick={() => {
              setAnomalyFilter(anomalyFilter === true ? null : true)
              setPage(1)
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border flex items-center gap-1.5",
              anomalyFilter === true
                ? "bg-red-500/20 text-red-300 border-red-500/30"
                : "bg-[rgba(15,26,46,0.6)] text-[#4d6a91] border-[rgba(99,155,255,0.1)] hover:border-[rgba(99,155,255,0.25)]"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Anomalies Only
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-[rgba(99,155,255,0.08)]">
              <th className="px-5 py-3.5 text-left text-sm font-medium text-[#4d6a91] uppercase tracking-wider">
                Risk
              </th>
              <th
                className="px-5 py-3.5 text-left text-sm font-medium text-[#4d6a91] uppercase tracking-wider cursor-pointer hover:text-[#8ba8d4] transition-colors"
                onClick={() => handleSort("timestamp")}
              >
                <div className="flex items-center gap-1">
                  Transaction <SortIcon col="timestamp" />
                </div>
              </th>
              <th className="px-5 py-3.5 text-left text-sm font-medium text-[#4d6a91] uppercase tracking-wider">
                Account
              </th>
              <th
                className="px-5 py-3.5 text-left text-sm font-medium text-[#4d6a91] uppercase tracking-wider cursor-pointer hover:text-[#8ba8d4] transition-colors"
                onClick={() => handleSort("amount")}
              >
                <div className="flex items-center gap-1">
                  Amount <SortIcon col="amount" />
                </div>
              </th>
              <th className="px-5 py-3.5 text-left text-sm font-medium text-[#4d6a91] uppercase tracking-wider">
                Signals
              </th>
              <th
                className="px-5 py-3.5 text-left text-sm font-medium text-[#4d6a91] uppercase tracking-wider cursor-pointer hover:text-[#8ba8d4] transition-colors"
                onClick={() => handleSort("anomaly_score")}
              >
                <div className="flex items-center gap-1">
                  Score <SortIcon col="anomaly_score" />
                </div>
              </th>
              <th className="px-5 py-3.5 text-right text-sm font-medium text-[#4d6a91] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(tx => {
              const risk = RISK_CONFIG[tx.risk_level] || RISK_CONFIG.low
              return (
                <tr
                  key={tx.id}
                  className="table-row-hover border-b border-[rgba(99,155,255,0.06)] last:border-0"
                >
                  {/* Risk */}
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium",
                        risk.className
                      )}
                    >
                      {risk.icon}
                      {risk.label}
                    </span>
                  </td>

                  {/* Merchant / Time */}
                  <td className="px-5 py-4">
                    <div className="font-medium text-[#e8f0fe]">
                      {tx.merchant || "Unknown Merchant"}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-[#4d6a91]">
                        {new Date(tx.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {tx.location && (
                        <span className="text-sm text-[#4d6a91] flex items-center gap-0.5">
                          <Globe className="w-3 h-3" />
                          {tx.location}
                        </span>
                      )}
                    </div>
                    <div className="mt-1">
                      <span className="text-sm px-1.5 py-0.5 rounded bg-[rgba(59,130,246,0.08)] text-[#4d6a91] capitalize">
                        {tx.transaction_type}
                      </span>
                    </div>
                  </td>

                  {/* Account */}
                  <td className="px-5 py-4">
                    <span className="mono text-[#8ba8d4] text-sm bg-[rgba(15,26,46,0.8)] px-2 py-1 rounded">
                      {tx.account_id}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[#e8f0fe] tabular-nums">
                      {formatCurrency(tx.amount, tx.currency)}
                    </div>
                    <div className="text-sm text-[#4d6a91] mt-0.5">{tx.currency}</div>
                  </td>

                  {/* Signals */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1 text-sm">
                      {tx.velocity_score != null && (
                        <div className="flex items-center gap-1.5 text-[#4d6a91]">
                          <Zap className="w-3 h-3" />
                          <span>
                            Velocity:{" "}
                            <span
                              className={cn(
                                "font-medium",
                                tx.velocity_score >= 8
                                  ? "text-red-400"
                                  : tx.velocity_score >= 5
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              )}
                            >
                              {tx.velocity_score}
                            </span>
                          </span>
                        </div>
                      )}
                      {tx.geo_anomaly_score != null && (
                        <div className="flex items-center gap-1.5 text-[#4d6a91]">
                          <Globe className="w-3 h-3" />
                          <span>
                            Geo:{" "}
                            <span
                              className={cn(
                                "font-medium",
                                tx.geo_anomaly_score >= 0.85
                                  ? "text-red-400"
                                  : tx.geo_anomaly_score >= 0.6
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              )}
                            >
                              {(tx.geo_anomaly_score * 100).toFixed(0)}%
                            </span>
                          </span>
                        </div>
                      )}
                      {tx.velocity_score == null && tx.geo_anomaly_score == null && (
                        <span className="text-[#2d4566]">—</span>
                      )}
                    </div>
                  </td>

                  {/* Score */}
                  <td className="px-5 py-4">
                    {tx.has_investigation ? (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-[rgba(15,26,46,0.8)] rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full score-bar",
                              tx.anomaly_score >= 0.7
                                ? "bg-gradient-to-r from-red-500 to-red-400"
                                : tx.anomaly_score >= 0.4
                                ? "bg-gradient-to-r from-amber-500 to-amber-400"
                                : "bg-gradient-to-r from-emerald-500 to-emerald-400"
                            )}
                            style={{
                              width: `${Math.max(tx.anomaly_score * 100, 3)}%`,
                            }}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            tx.anomaly_score >= 0.7
                              ? "text-red-400"
                              : tx.anomaly_score >= 0.4
                              ? "text-amber-400"
                              : "text-emerald-400"
                          )}
                        >
                          {(tx.anomaly_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[#4d6a91]">
                        <span className="text-sm">—</span>
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onInvestigate(tx)}
                        disabled={loadingId === tx.id || tx.has_investigation}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all",
                          (loadingId === tx.id || tx.has_investigation)
                            ? "opacity-50 cursor-not-allowed bg-[rgba(59,130,246,0.05)] text-blue-400 border border-[rgba(59,130,246,0.1)]"
                            : "bg-[rgba(59,130,246,0.12)] text-blue-400 hover:bg-[rgba(59,130,246,0.25)] hover:text-blue-300 border border-[rgba(59,130,246,0.2)] hover:border-[rgba(59,130,246,0.4)]"
                        )}
                      >
                        {loadingId === tx.id ? (
                          <span className="spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full inline-block" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                        {tx.has_investigation ? "Investigated" : "Investigate"}
                      </button>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(tx.id)}
                          className="btn-danger text-sm py-1.5 px-2"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}

            {paginated.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[rgba(15,26,46,0.8)] border border-[rgba(99,155,255,0.12)] flex items-center justify-center">
                      <Search className="w-5 h-5 text-[#4d6a91]" />
                    </div>
                    <p className="text-[#4d6a91] text-base">No transactions found</p>
                    {(searchTerm || riskFilter || anomalyFilter !== null) && (
                      <button
                        onClick={() => {
                          setSearchTerm("")
                          setRiskFilter(null)
                          setAnomalyFilter(null)
                        }}
                        className="text-sm text-blue-400 hover:text-blue-300 underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3.5 border-t border-[rgba(99,155,255,0.08)] flex items-center justify-between">
          <p className="text-sm text-[#4d6a91]">
            Page {page} of {totalPages} · {filtered.length} results
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm rounded border border-[rgba(99,155,255,0.12)] text-[#4d6a91] hover:border-[rgba(99,155,255,0.3)] hover:text-[#8ba8d4] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    "w-8 h-7 text-sm rounded border transition-all",
                    p === page
                      ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                      : "border-[rgba(99,155,255,0.12)] text-[#4d6a91] hover:border-[rgba(99,155,255,0.3)]"
                  )}
                >
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm rounded border border-[rgba(99,155,255,0.12)] text-[#4d6a91] hover:border-[rgba(99,155,255,0.3)] hover:text-[#8ba8d4] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
