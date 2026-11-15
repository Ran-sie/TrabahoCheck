export type RiskLevel = 'low' | 'medium' | 'high'
export type Severity = 'low' | 'medium' | 'high'
export type Lang = 'en' | 'tl'

export interface Bilingual {
  en: string
  tl: string
}

export interface RedFlag {
  title: string
  detail: string
  tl: { title: string; detail: string }
  severity: Severity
  evidence: string | null
}

export interface CompanyDomain {
  domain: string
  age_days: number | null
  exists: boolean
}

export interface CheckResult {
  score: number
  level: RiskLevel
  flags: RedFlag[]
  positives: Bilingual[]
  company: CompanyDomain[]
  /** Set when the optional AI opinion is turned on; used to ask for it afterwards. */
  review_id: string | null
}

export interface Resume {
  name: string
  size: number
  uploaded_at: string
}

export interface Experience {
  title: string
  company: string | null
  start: string | null
  end: string | null
  description: string | null
}

export interface Education {
  school: string
  degree: string | null
  start: string | null
  end: string | null
}

/** Everything the user edits on their profile page. */
export interface ProfileFields {
  name: string
  email: string
  phone: string | null
  location: string | null
  headline: string | null
  summary: string | null
  website: string | null
  skills: string[]
  experience: Experience[]
  education: Education[]
  certifications: string[]
  languages: string[]
}

export interface User extends ProfileFields {
  resume: Resume | null
}

export interface AiReview {
  risk: number
  level: RiskLevel
  /** The headline result: the AI's risk, kept at or above a critical rule's floor. */
  final: { score: number; level: RiskLevel }
  summary: Bilingual
  reasons: Bilingual[]
}
