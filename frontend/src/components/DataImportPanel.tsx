"use client"

import { useState, useEffect } from "react"
import {
  Database, Upload, RefreshCw, CheckCircle2, AlertTriangle, Loader2, HardDrive
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/utils"

interface DataImportPanelProps {
  onDataChanged: () => void
}

export default function DataImportPanel({ onDataChanged }: DataImportPanelProps) {
  const [txCount, setTxCount] = useState<number | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [csvLimit, setCsvLimit] = useState(5000)
  const [lastSeeded, setLastSeeded] = useState<string | null>(null)

  const [overview, setOverview] = useState<any>(null)

  const fetchData = async () => {
    try {
      const [countData, overviewData] = await Promise.all([
        api.transactions.count(),
        api.analytics.overview()
      ])
      setTxCount(countData.count)
      setOverview(overviewData)
    } catch {}
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#e8f0fe]">Dataset Overview</h2>
        <p className="text-base text-[#4d6a91] mt-0.5">Explore the loaded Kaggle dataset capabilities</p>
      </div>

      {/* Stats Card */}
      <div className="glass-card p-5 border border-[rgba(99,155,255,0.1)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <HardDrive className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-3xl font-bold text-[#e8f0fe] tabular-nums">
              {txCount === null ? (
                <span className="skeleton inline-block w-20 h-8" />
              ) : (
                txCount.toLocaleString()
              )}
            </p>
            <p className="text-base text-[#4d6a91]">Transactions in Database</p>
          </div>
          <button onClick={fetchData} className="ml-auto p-2 rounded-lg border border-[rgba(99,155,255,0.12)] text-[#4d6a91] hover:text-[#8ba8d4] transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {lastSeeded && (
          <div className="mt-4 pt-4 border-t border-[rgba(99,155,255,0.08)] flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Last action: {lastSeeded}
          </div>
        )}
      </div>

      {/* Dataset Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Dataset Features */}
        <div className="glass-card p-6 border border-[rgba(99,155,255,0.1)] flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-[#e8f0fe] text-lg">Dataset Intelligence</h3>
              <p className="text-sm text-[#4d6a91] mt-1 leading-relaxed">
                The database is fully loaded with real world anomalies. It includes sophisticated signals used by the AI agent to detect fraud instantly.
              </p>
            </div>
          </div>
          
          <div className="mt-2 space-y-3">
            <div className="flex items-center gap-2 text-sm text-[#8ba8d4]">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Calculated Transaction Velocity</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#8ba8d4]">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Historical Spending Deviation</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#8ba8d4]">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Geographic Anomaly Flags</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#8ba8d4]">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Over {overview?.anomaly_transactions?.toLocaleString() || "179,000"} labeled fraud records</span>
            </div>
          </div>
        </div>

        {/* System Capabilities */}
        <div className="glass-card p-6 border border-[rgba(99,155,255,0.1)] flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-[#e8f0fe] text-lg">Autonomous Agent</h3>
              <p className="text-sm text-[#4d6a91] mt-1 leading-relaxed">
                The AI Agent uses a multi-step LangGraph pipeline to investigate any suspicious transaction in the system.
              </p>
            </div>
          </div>
          
          <div className="mt-2 space-y-3">
            <div className="flex items-center gap-2 text-sm text-[#8ba8d4]">
              <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span>Pinecone RAG Vector Search</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#8ba8d4]">
              <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span>Self-Reflecting LLM Scoring</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#8ba8d4]">
              <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span>Comprehensive Investigation Reports</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info panel */}
      <div className="glass-card p-5 border border-[rgba(99,155,255,0.08)] bg-[rgba(15,26,46,0.4)]">
        <h3 className="text-base font-semibold text-[#8ba8d4] mb-3">📊 Dataset Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { label: "Total Records", value: "5,000,000" },
            { label: "Fraud Cases", value: "179,553" },
            { label: "Fraud Rate", value: "3.59%" },
            { label: "Locations", value: "8 Cities" },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-lg bg-[rgba(15,26,46,0.6)] border border-[rgba(99,155,255,0.08)]">
              <div className="text-lg font-bold gradient-text">{value}</div>
              <div className="text-sm text-[#4d6a91] mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
