export const STEP_LABELS = ['JD Input', 'Clarify', 'Keywords', 'Upload', 'Results', 'Compare']

export const ACCORDION_KEYS = ['career', 'gaps', 'education', 'skills', 'summary', 'remark', 'strengths', 'companyFit', 'clientHistory', 'notes']

export const REC_CFG = {
  proceed:        { label: 'Proceed',        icon: '✓', cls: 'bg-primary text-white',   glow: true  },
  hold:           { label: 'Hold',           icon: '⚠', cls: 'bg-warn text-white',       glow: false },
  do_not_proceed: { label: 'Do Not Proceed', icon: '✕', cls: 'bg-danger text-white',     glow: false },
}

export const TIER_LABEL = { 1: 'Tier 1 — Large (500+)', 2: 'Tier 2 — Mid-size (200–499)', 3: 'Tier 3 — Small (<200)' }
export const TIER_COLOR = {
  1: 'bg-primary-surface text-primary border-primary-border',
  2: 'bg-warn-bg text-warn border-warn',
  3: 'bg-gray-100 text-ink-3 border-gray-200',
}

export const VERDICT_CFG = {
  strong_fit:  { label: 'Strong Fit',  cls: 'bg-primary-surface text-primary border-primary-border', bar: 'bg-primary' },
  partial_fit: { label: 'Partial Fit', cls: 'bg-warn-bg text-warn border-warn',                       bar: 'bg-warn'    },
  weak_fit:    { label: 'Weak Fit',    cls: 'bg-warn-bg text-warn border-warn',                       bar: 'bg-warn'    },
  mismatch:    { label: 'Mismatch',    cls: 'bg-danger-bg text-danger border-danger',                 bar: 'bg-danger'  },
}

export const FIELD_META = {
  min_experience:       { label: 'Minimum Experience (years)', placeholder: 'e.g. 3', type: 'number' },
  max_experience:       { label: 'Maximum Experience (years)', placeholder: 'e.g. 8', type: 'number' },
  must_have_skills:     { label: 'Mandatory / Must-have Skills', placeholder: 'e.g. Python, SQL, REST APIs', type: 'text' },
  nice_to_have_skills:  { label: 'Good-to-have Skills', placeholder: 'e.g. Docker, Kubernetes', type: 'text' },
  client_company:       { label: 'Client Company Name', placeholder: 'e.g. Volkswagen India', type: 'text' },
  work_location:        { label: 'Job Location', placeholder: 'e.g. Pune, Bangalore, Mumbai, Remote, or Hybrid', type: 'text' },
  industry:             { label: 'Industry / Domain Preference', placeholder: 'e.g. FinTech, Healthcare, Manufacturing', type: 'text' },
  product_client_check: { label: 'Product / Platform / Client Constraints', placeholder: 'e.g. Must have SAP S/4HANA, or must not be from Tata Motors', type: 'text' },
}

export const INIT_ANSWERS = {
  min_experience: '', max_experience: '', must_have_skills: '', nice_to_have_skills: '',
  client_company: '', work_location: '', industry: '', product_client_check: '',
}

export const INIT_KEYWORDS = { must_have: [], nice_to_have: [] }

export const HYGIENE_QUESTIONS = [
  'What is your current CTC? (ask for fixed and variable separately)',
  'What is your expected CTC?',
  'What is your current notice period?',
  'Are you currently serving your notice period? If yes, what is your last working day?',
  'What is your current work location and native place?',
  'What is your primary reason for looking for a change?',
  'Do you have any other offers in hand currently? If yes — which companies, what CTC offered, and what stage?',
  'How many interviews are you currently appearing for?',
  'What is your expected joining date if selected?',
  'Are you open to travelling as part of the role if required?',
  'Have you worked directly with clients or was your role internal facing?',
  'Have you managed people or led a team? If yes, how many reportees?',
  'What is your current take-home per month?',
  'Does your current CTC include any variables or bonuses?',
  'Are there any joining bonuses or increments due that you would be forfeiting by leaving now?',
  'What is your minimum acceptable CTC to make this move?',
  'Why are you interested in this specific role?',
  'What do you know about our client company?',
]
