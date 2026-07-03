/**
 * Centralized API client for the Financial Anomaly Investigation Agent.
 * Uses NEXT_PUBLIC_API_URL environment variable — set this for each deployment.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1"

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  })
  if (!res.ok) {
    const error = await res.text().catch(() => `HTTP ${res.status}`)
    throw new Error(error || `Request failed: ${res.status}`)
  }
  return res.json()
}

// ── Transactions ─────────────────────────────────────────────────
export const api = {
  // Health
  health: () => fetchJSON(`${API_BASE.replace("/api/v1", "")}/health`),

  // Transactions
  transactions: {
    list: (params?: {
      skip?: number
      limit?: number
      risk_level?: string
      is_anomaly?: boolean
      account_id?: string
    }) => {
      const query = new URLSearchParams()
      if (params?.skip !== undefined) query.set("skip", String(params.skip))
      if (params?.limit !== undefined) query.set("limit", String(params.limit))
      if (params?.risk_level) query.set("risk_level", params.risk_level)
      if (params?.is_anomaly !== undefined) query.set("is_anomaly", String(params.is_anomaly))
      if (params?.account_id) query.set("account_id", params.account_id)
      return fetchJSON<any[]>(`${API_BASE}/transactions/?${query}`)
    },

    get: (id: string) => fetchJSON<any>(`${API_BASE}/transactions/${id}`),

    create: (data: any) =>
      fetchJSON<any>(`${API_BASE}/transactions/`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      fetch(`${API_BASE}/transactions/${id}`, { method: "DELETE" }),

    count: () => fetchJSON<{ count: number }>(`${API_BASE}/transactions/count`),

    seedDemo: () =>
      fetchJSON<any>(`${API_BASE}/transactions/seed-demo`, { method: "POST" }),

    seedFromCSV: (limit = 5000) =>
      fetchJSON<any>(`${API_BASE}/transactions/seed-from-csv?limit=${limit}`, {
        method: "POST",
      }),
  },

  // Anomaly Investigations
  investigations: {
    investigate: (data: any) =>
      fetchJSON<any>(`${API_BASE}/anomalies/investigate`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    list: (params?: { skip?: number; limit?: number; status?: string }) => {
      const query = new URLSearchParams()
      if (params?.skip !== undefined) query.set("skip", String(params.skip))
      if (params?.limit !== undefined) query.set("limit", String(params.limit))
      if (params?.status) query.set("status", params.status)
      return fetchJSON<any[]>(`${API_BASE}/anomalies/?${query}`)
    },

    get: (id: string) => fetchJSON<any>(`${API_BASE}/anomalies/${id}`),

    stats: () => fetchJSON<any>(`${API_BASE}/anomalies/stats`),
  },

  // Analytics
  analytics: {
    overview: () => fetchJSON<any>(`${API_BASE}/analytics/overview`),
    riskDistribution: () => fetchJSON<any>(`${API_BASE}/analytics/risk-distribution`),
    anomalyTimeline: (days = 30) =>
      fetchJSON<any>(`${API_BASE}/analytics/anomaly-timeline?days=${days}`),
    locationStats: () => fetchJSON<any>(`${API_BASE}/analytics/location-stats`),
    merchantStats: () => fetchJSON<any>(`${API_BASE}/analytics/merchant-stats`),
    accountStats: (limit = 10) =>
      fetchJSON<any>(`${API_BASE}/analytics/account-stats?limit=${limit}`),
    pineconeStats: () => fetchJSON<any>(`${API_BASE}/analytics/pinecone-stats`),
  },
}

export { API_BASE }
