export interface OcrCandidates {
  companyNameCandidate: string
  personNameCandidate: string
  titleCandidate: string
  urlCandidate: string
  emailCandidate: string
  phoneCandidate: string
  postalCodeCandidate: string
  addressCandidate: string
}

export interface OcrFields {
  company_name: string
  person_name: string
  department: string
  title: string
  email: string
  phone: string
  mobile: string
  postal_code: string
  address: string
  website: string
}

export interface OcrResponse {
  raw_text_front: string
  raw_text_back: string
  fields: OcrFields
}
