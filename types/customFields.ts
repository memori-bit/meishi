export type CustomFieldType = 'text' | 'radio' | 'checkbox' | 'select'

export interface CustomField {
  id: string
  label: string
  type: CustomFieldType
  options?: string[] | null
  createdAt?: string
}

export interface CustomFieldValuePayload {
  fieldId: string
  value: string | string[]
}
