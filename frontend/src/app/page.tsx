"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ShieldAlert, BarChart3, Database, ClipboardList, Plus, Upload,
  AlertTriangle, Shield, TrendingUp, Activity, Zap, RefreshCw, X, ChevronRight
} from "lucide-react"
import { toast } from "react-hot-toast"
import TransactionTable from "@/components/TransactionTable"
import ReportViewer from "@/components/ReportViewer"
import AnalyticsDashboard from "@/components/AnalyticsDashboard"
import DataImportPanel from "@/components/DataImportPanel"
import InvestigationsPanel from "@/components/InvestigationsPanel"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Transaction, InvestigationDetails, OverviewStats } from "@/types"

type Tab = "transactions" | "analytics" | "investigations" | "data"

const TABS = [
  { id: "transactions" as Tab, label: "Transactions", icon: <Activity className="w-4 h-4" /> },
  { id: "analytics" as Tab, label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "investigations" as Tab, label: "Investigations", icon: <ClipboardList className="w-4 h-4" /> },
  { id: "data" as Tab, label: "Data Management", icon: <Database className="w-4 h-4" /> },
]

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("transactions")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [overview, setOverview] = useState<OverviewStats | null>(null)

  // Report viewer state
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [investigation, setInvestigation] = useState<InvestigationDetails | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // Create transaction modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTx, setNewTx] = useState({
    account_id: "ACC-TEST",
    amount: 5000,
    currency: "USD",
    transaction_type: "payment",
    merchant: "Online Store",
    location: "Singapore",
    description: "Test transaction",
    velocity_score: "",
    geo_anomaly_score: "",
    spending_deviation: "",
  })

  // View investigation from InvestigationsPanel
  const [viewingInvId, setViewingInvId] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    try {
      const data = await api.transactions.list({ limit: 100 })
      setTransactions(data)
    } catch (e) {
      console.error("Failed to fetch transactions:", e)
    }
  }, [])

  const fetchOverview = useCallback(async () => {
    try {
      const data = await api.analytics.overview()
      setOverview(data)
    } catch {}
  }, [])

  useEffect(() => {
    fetchTransactions()
    fetchOverview()
  }, [fetchTransactions, fetchOverview])

  // Handle "View Report" from InvestigationsPanel
  useEffect(() => {
    if (!viewingInvId) return
    const fetchInvForView = async () => {
      try {
        const inv = await api.investigations.get(viewingInvId)
        setInvestigation(inv)
        // Find the matching transaction or create a placeholder
        const tx = transactions.find(t => t.id === inv.transaction_id)
        if (tx) {
          setSelectedTx(tx)
        } else {
          // Create a minimal placeholder transaction for display
          setSelectedTx({
            id: inv.transaction_id,
            account_id: inv.account_id,
            amount: 0,
            currency: "USD",
            transaction_type: "payment",
            merchant: "Unknown",
            location: "Unknown",
            description: null,
            anomaly_score: inv.anomaly_score,
            risk_level: "medium",
            is_anomaly: inv.anomaly_score >= 0.6,
            timestamp: inv.started_at,
            created_at: inv.created_at,
            fraud_type: null,
            velocity_score: null,
            geo_anomaly_score: null,
            spending_deviation: null,
            device_used: null,
            payment_channel: null,
          })
        }
      } catch (e) {
        toast.error("Failed to load investigation")
      } finally {
        setViewingInvId(null)
      }
    }
    fetchInvForView()
  }, [viewingInvId, transactions])

  const handleInvestigate = async (tx: Transaction) => {
    setLoadingId(tx.id)
    try {
      const invSummary = await api.investigations.investigate({
        transaction_id: tx.id,
        account_id: tx.account_id,
        amount: tx.amount,
        currency: tx.currency,
        transaction_type: tx.transaction_type,
        merchant: tx.merchant || "Unknown",
        location: tx.location || "Unknown",
        description: tx.description || "",
        timestamp: tx.timestamp,
        velocity_score: tx.velocity_score,
        geo_anomaly_score: tx.geo_anomaly_score,
        spending_deviation: tx.spending_deviation,
        fraud_type: tx.fraud_type,
        device_used: tx.device_used,
        payment_channel: tx.payment_channel,
      })
      setSelectedTx(tx)
      fetchInvestigationDetails(invSummary.id)
      toast.success("Investigation started!")
    } catch (e: any) {
      toast.error(`Failed to start investigation: ${e.message}`)
    } finally {
      setLoadingId(null)
    }
  }

  const fetchInvestigationDetails = async (id: string) => {
    try {
      const data = await api.investigations.get(id)
      setInvestigation(data)
    } catch (e) {
      console.error("Failed to fetch investigation:", e)
    }
  }

  const handleDelete = async (txId: string) => {
    try {
      await api.transactions.delete(txId)
      setTransactions(prev => prev.filter(t => t.id !== txId))
      toast.success("Transaction deleted")
    } catch {
      toast.error("Failed to delete transaction")
    }
  }

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.transactions.create({
        ...newTx,
        amount: Number(newTx.amount),
        velocity_score: newTx.velocity_score ? Number(newTx.velocity_score) : null,
        geo_anomaly_score: newTx.geo_anomaly_score ? Number(newTx.geo_anomaly_score) : null,
        spending_deviation: newTx.spending_deviation ? Number(newTx.spending_deviation) : null,
      })
      setIsCreateOpen(false)
      fetchTransactions()
      fetchOverview()
      toast.success("Transaction created!")
    } catch (e: any) {
      toast.error(`Failed to create: ${e.message}`)
    }
  }

  // Show report viewer
  if (selectedTx) {
    return (
      <main className="min-h-screen p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <ReportViewer
            transaction={selectedTx}
            investigation={investigation}
            onBack={() => {
              setSelectedTx(null)
              setInvestigation(null)
              fetchTransactions()
              fetchOverview()
            }}
            onRefresh={() => {
              if (investigation?.id) fetchInvestigationDetails(investigation.id)
            }}
          />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      {/* ── Hero Header ──────────────────────────────────────────── */}
      <div className="border-b border-[rgba(99,155,255,0.1)] bg-[rgba(6,11,24,0.8)] backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold gradient-text">FinGuard AI</h1>
                <p className="text-sm text-[#4d6a91]">Autonomous Anomaly Investigation</p>
              </div>
            </div>

            <div className="flex items-center gap-2">

              <button
                onClick={() => { fetchTransactions(); fetchOverview() }}
                className="p-2 rounded-lg border border-[rgba(99,155,255,0.12)] text-[#4d6a91] hover:text-[#8ba8d4] transition-all"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* ── Stats Overview Row ─────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: "Transactions",
              value: overview?.total_transactions?.toLocaleString() ?? "—",
              icon: <Database className="w-4 h-4" />,
              color: "text-blue-400",
              bg: "bg-blue-500/10 border-blue-500/15",
            },
            {
              label: "Anomalies",
              value: overview?.anomaly_transactions?.toLocaleString() ?? "—",
              icon: <AlertTriangle className="w-4 h-4" />,
              color: "text-red-400",
              bg: "bg-red-500/10 border-red-500/15",
            },
            {
              label: "Anomaly Rate",
              value: overview ? `${overview.anomaly_rate}%` : "—",
              icon: <TrendingUp className="w-4 h-4" />,
              color: "text-amber-400",
              bg: "bg-amber-500/10 border-amber-500/15",
            },
            {
              label: "Investigations",
              value: overview?.total_investigations?.toLocaleString() ?? "—",
              icon: <ClipboardList className="w-4 h-4" />,
              color: "text-purple-400",
              bg: "bg-purple-500/10 border-purple-500/15",
            },
            {
              label: "Avg Confidence",
              value: overview ? `${(overview.avg_confidence_score * 100).toFixed(1)}%` : "—",
              icon: <Shield className="w-4 h-4" />,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10 border-emerald-500/15",
            },
            {
              label: "Critical Alerts",
              value: overview?.critical_alerts?.toLocaleString() ?? "—",
              icon: <Zap className="w-4 h-4" />,
              color: "text-red-400",
              bg: "bg-red-500/8 border-red-500/15",
            },
          ].map(({ label, value, icon, color, bg }) => (
            <div key={label} className={cn("glass-card p-4 border flex items-center gap-3", bg)}>
              <div className={cn("flex-shrink-0", color)}>{icon}</div>
              <div className="min-w-0">
                <div className={cn("text-xl font-bold tabular-nums truncate", color)}>{value}</div>
                <div className="text-sm text-[#4d6a91] truncate">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tab Navigation ─────────────────────────────────────── */}
        <div className="flex border-b border-[rgba(99,155,255,0.1)] gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-base font-medium transition-all relative",
                tab === t.id
                  ? "text-[#e8f0fe] tab-active"
                  : "text-[#4d6a91] hover:text-[#8ba8d4]"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ────────────────────────────────────────── */}
        {tab === "transactions" && (
          <TransactionTable
            transactions={transactions}
            onInvestigate={handleInvestigate}
            onDelete={handleDelete}
            loadingId={loadingId}
          />
        )}

        {tab === "analytics" && <AnalyticsDashboard />}

        {tab === "investigations" && (
          <InvestigationsPanel
            onViewReport={(id) => setViewingInvId(id)}
          />
        )}

        {tab === "data" && (
          <DataImportPanel
            onDataChanged={() => {
              fetchTransactions()
              fetchOverview()
            }}
          />
        )}
      </div>


    </main>
  )
}
