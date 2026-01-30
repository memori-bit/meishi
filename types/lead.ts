/** リード（CRM用：一覧・登録・ステータス・メモ） */
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'lost'

export type Lead = {
  id: string
  companyName: string
  personName: string
  email?: string | null
  phone?: string | null
  website?: string | null
  status: LeadStatus
  memo?: string | null
  createdAt?: string
}
