"use client"

import { useEffect, useState } from "react"
import { BarChart3, Globe, ShoppingBag, RefreshCw, Database } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function AnalyticsDashboard() {
  const [riskDist, setRiskDist] = useState<any>(null)
  const [timeline, setTimeline] = useState<any>(null)
  const [locations, setLocations] = useState<any>(null)
  const [merchants, setMerchants] = useState<any>(null)
  const [pinecone, setPinecone] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [rd, tl, loc, mer, pc] = await Promise.allSettled([
        api.analytics.riskDistribution(),
        api.analytics.anomalyTimeline(14),
        api.analytics.locationStats(),
        api.analytics.merchantStats(),
        api.analytics.pineconeStats(),
      ])
      if (rd.status === "fulfilled") setRiskDist(rd.value)
      if (tl.status === "fulfilled") setTimeline(tl.value)
      if (loc.status === "fulfilled") setLocations(loc.value)
      if (mer.status === "fulfilled") setMerchants(mer.value)
      if (pc.status === "fulfilled") setPinecone(pc.value)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const RISK_COLORS = {
    low: { fill: "#10b981", label: "Low Risk", text: "text-emerald-400" },
    medium: { fill: "#3b82f6", label: "Medium Risk", text: "text-blue-400" },
    high: { fill: "#f59e0b", label: "High Risk", text: "text-amber-400" },
    critical: { fill: "#ef4444", label: "Critical", text: "text-red-400" },
  }

  // SVG Donut Chart
  const DonutChart = ({ data }: { data: Record<string, number> }) => {
    const total = Object.values(data).reduce((a, b) => a + b, 0)
    if (total === 0) return (
      <div className="flex items-center justify-center h-36 text-[#2d4566] text-base">
        No data yet
      </div>
    )

    let cumulative = 0
    const segments = Object.entries(data).map(([key, value]) => {
      const pct = value / total
      const startAngle = cumulative * 360
      cumulative += pct
      const endAngle = cumulative * 360
      return { key, value, pct, startAngle, endAngle, color: RISK_COLORS[key as keyof typeof RISK_COLORS]?.fill || "#3b82f6" }
    }).filter(s => s.value > 0)

    const polarToCart = (angle: number, r: number) => {
      const rad = ((angle - 90) * Math.PI) / 180
      return { x: 50 + r * Math.cos(rad), y: 50 + r * Math.sin(rad) }
    }

    const describeArc = (startAngle: number, endAngle: number, outerR: number, innerR: number) => {
      if (endAngle - startAngle >= 360) endAngle = 359.99
      const s1 = polarToCart(startAngle, outerR)
      const e1 = polarToCart(endAngle, outerR)
      const s2 = polarToCart(endAngle, innerR)
      const e2 = polarToCart(startAngle, innerR)
      const large = endAngle - startAngle > 180 ? 1 : 0
      return `M ${s1.x} ${s1.y} A ${outerR} ${outerR} 0 ${large} 1 ${e1.x} ${e1.y} L ${s2.x} ${s2.y} A ${innerR} ${innerR} 0 ${large} 0 ${e2.x} ${e2.y} Z`
    }

    return (
      <div className="flex items-center gap-6">
        <svg viewBox="0 0 100 100" className="w-36 h-36 flex-shrink-0">
          {segments.map(seg => (
            <path
              key={seg.key}
              d={describeArc(seg.startAngle, seg.endAngle, 45, 28)}
              fill={seg.color}
              opacity="0.85"
              className="transition-opacity hover:opacity-100 cursor-pointer"
            />
          ))}
          <text x="50" y="47" textAnchor="middle" fill="#e8f0fe" fontSize="12" fontWeight="700">{total}</text>
          <text x="50" y="58" textAnchor="middle" fill="#4d6a91" fontSize="6">Total</text>
        </svg>
        <div className="space-y-2">
          {segments.map(seg => (
            <div key={seg.key} className="flex items-center gap-2 text-sm">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
              <span className="text-[#8ba8d4]">{RISK_COLORS[seg.key as keyof typeof RISK_COLORS]?.label || seg.key}</span>
              <span className="text-[#4d6a91] ml-auto pl-4 tabular-nums">{seg.value}</span>
              <span className="text-[#2d4566] w-8 text-right tabular-nums">{(seg.pct * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Bar Chart for timeline
  const TimelineChart = ({ data }: { data: any[] }) => {
    if (!data || data.length === 0) return (
      <div className="flex items-center justify-center h-32 text-[#2d4566] text-base">No timeline data</div>
    )
    const recent = data.slice(-14)
    const maxTotal = Math.max(...recent.map(d => d.total), 1)

    return (
      <div className="flex items-end gap-1 h-32 w-full">
        {recent.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="w-full flex flex-col justify-end" style={{ height: "100px" }}>
              {/* Total bar */}
              <div
                className="w-full rounded-t bg-[rgba(59,130,246,0.2)] border-t border-[rgba(59,130,246,0.3)] chart-bar"
                style={{ height: `${(d.total / maxTotal) * 100}%` }}
                title={`${d.date}: ${d.total} total`}
              />
            </div>
            {/* Anomaly overlay */}
            <div className="relative w-full" style={{ marginTop: `-${(d.anomalies / maxTotal) * 100}%` }}>
              <div
                className="w-full rounded-t bg-red-500/40 border-t border-red-500/50 chart-bar absolute bottom-0"
                style={{ height: `${(d.anomalies / maxTotal) * 100}%` }}
                title={`${d.anomalies} anomalies`}
              />
            </div>
            <div className="text-[8px] text-[#2d4566] group-hover:text-[#4d6a91] transition-colors">
              {d.date.slice(5)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Horizontal bar for top locations/merchants
  const HorizontalBar = ({ items, keyField, maxVal }: { items: any[]; keyField: string; maxVal: number }) => (
    <div className="space-y-3">
      {items.slice(0, 6).map((item, i) => (
        <div key={i}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-[#8ba8d4] truncate">{item[keyField]}</span>
            <span className="text-[#4d6a91] tabular-nums flex-shrink-0 ml-2">
              {item.fraud_count > 0 && (
                <span className="text-red-400 mr-1">{item.fraud_count} fraud ·</span>
              )}
              {item.total}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[rgba(15,26,46,0.8)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 opacity-70 chart-bar"
              style={{ width: `${(item.total / maxVal) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#e8f0fe]">Analytics Dashboard</h2>
          <p className="text-base text-[#4d6a91] mt-0.5">Real-time fraud intelligence</p>
        </div>
        <button onClick={fetchAll} className="btn-secondary text-sm py-1.5">
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "spin")} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-5 border border-[rgba(99,155,255,0.1)] h-52">
              <div className="skeleton h-4 w-32 mb-4" />
              <div className="skeleton h-32 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Risk Distribution Donut */}
            <div className="glass-card p-5 border border-[rgba(99,155,255,0.1)]">
              <h3 className="text-base font-semibold text-[#8ba8d4] mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                Risk Distribution
              </h3>
              {riskDist ? (
                <DonutChart data={riskDist.data} />
              ) : (
                <div className="text-base text-[#2d4566]">No data available</div>
              )}
            </div>

            {/* Anomaly Timeline */}
            <div className="glass-card p-5 border border-[rgba(99,155,255,0.1)]">
              <h3 className="text-base font-semibold text-[#8ba8d4] mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                Anomaly Timeline (14 months)
              </h3>
              <div className="flex gap-4 text-sm mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-blue-500/30" />
                  <span className="text-[#4d6a91]">Total</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-red-500/50" />
                  <span className="text-[#4d6a91]">Anomalies</span>
                </div>
              </div>
              {timeline ? (
                <TimelineChart data={timeline.timeline} />
              ) : (
                <div className="text-base text-[#2d4566] py-12 text-center">No timeline data</div>
              )}
            </div>

            {/* Top Locations */}
            <div className="glass-card p-5 border border-[rgba(99,155,255,0.1)]">
              <h3 className="text-base font-semibold text-[#8ba8d4] mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                Top Locations by Volume
              </h3>
              {locations?.locations?.length > 0 ? (
                <HorizontalBar
                  items={locations.locations}
                  keyField="location"
                  maxVal={Math.max(...locations.locations.map((l: any) => l.total), 1)}
                />
              ) : (
                <div className="text-base text-[#2d4566] py-8 text-center">No location data</div>
              )}
            </div>

            {/* Merchant Categories */}
            <div className="glass-card p-5 border border-[rgba(99,155,255,0.1)]">
              <h3 className="text-base font-semibold text-[#8ba8d4] mb-4 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                Merchant Categories
              </h3>
              {merchants?.merchants?.length > 0 ? (
                <HorizontalBar
                  items={merchants.merchants}
                  keyField="merchant"
                  maxVal={Math.max(...merchants.merchants.map((m: any) => m.total), 1)}
                />
              ) : (
                <div className="text-base text-[#2d4566] py-8 text-center">No merchant data</div>
              )}
            </div>
          </div>

          {/* Pinecone Index Stats */}
          {pinecone && (
            <div className="glass-card p-5 border border-[rgba(99,155,255,0.1)]">
              <h3 className="text-base font-semibold text-[#8ba8d4] mb-4 flex items-center gap-2">
                <Database className="w-4 h-4 text-green-400" />
                Pinecone Vector Index
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.15)]">
                  <div className="text-2xl font-bold text-emerald-400">{pinecone.total_vector_count?.toLocaleString() || 0}</div>
                  <div className="text-sm text-[#4d6a91] mt-1">Fraud Cases Indexed</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.15)]">
                  <div className="text-2xl font-bold text-blue-400">{pinecone.dimension || 768}</div>
                  <div className="text-sm text-[#4d6a91] mt-1">Embedding Dimensions</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-[rgba(139,92,246,0.05)] border border-[rgba(139,92,246,0.15)]">
                  <div className={cn("text-2xl font-bold", pinecone.status === "connected" ? "text-emerald-400" : "text-red-400")}>
                    {pinecone.status === "connected" ? "●" : "○"}
                  </div>
                  <div className="text-sm text-[#4d6a91] mt-1">{pinecone.status === "connected" ? "Connected" : "Disconnected"}</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
