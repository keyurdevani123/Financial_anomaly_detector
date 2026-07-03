export interface Transaction {
  id: string
  account_id: string
  amount: number
  currency: string
  transaction_type: "debit" | "credit" | "transfer" | "refund" | "withdrawal" | "deposit" | "payment"
  merchant: string | null
  location: string | null
  description: string | null
  anomaly_score: number
  risk_level: "low" | "medium" | "high" | "critical"
  is_anomaly: boolean
  timestamp: string
  created_at: string
  // Dataset-specific fields
  fraud_type: string | null
  velocity_score: number | null
  geo_anomaly_score: number | null
  spending_deviation: number | null
  device_used: string | null
  payment_channel: string | null
  has_investigation?: boolean
}

export interface InvestigationSummary {
  id: string
  transaction_id: string
  account_id: string
  status: "pending" | "running" | "completed" | "failed"
  anomaly_score: number
  confidence_score: number
  rerun_count: number
  started_at: string
  completed_at: string | null
  created_at: string
}

export interface InvestigationDetails extends InvestigationSummary {
  explanation: string | null
  root_cause: string | null
  final_report: string | null
  recommended_actions: string[] | null
  similar_cases: SimilarCase[] | null
  anomaly_flags: string[] | null
  risk_level: string | null
}

export interface SimilarCase {
  id: string
  score: number
  metadata: {
    amount?: number
    transaction_type?: string
    merchant_category?: string
    location?: string
    fraud_type?: string
    outcome?: string
    velocity_score?: number
    geo_anomaly_score?: number
  }
}

export interface DashboardStats {
  total_investigations: number
  completed: number
  running: number
  anomalies_detected: number
  avg_confidence_score: number
  avg_rerun_count: number
}

export interface OverviewStats {
  total_transactions: number
  anomaly_transactions: number
  total_investigations: number
  completed_investigations: number
  avg_confidence_score: number
  critical_alerts: number
  anomaly_rate: number
}

export interface RiskDistribution {
  data: { low: number; medium: number; high: number; critical: number }
  total: number
  anomaly_count: number
}

export interface TimelinePoint {
  date: string
  total: number
  anomalies: number
}
