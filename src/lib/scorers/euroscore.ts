export interface EuroScoreInputs {
  // Patient factors
  age: number;
  female: boolean;
  creatinine_umol: number | null;
  creatinine_mgdl: number | null;
  use_umol: boolean;
  // Extra-cardiac arteriopathy
  extra_cardiac_arteriopathy: boolean;
  // Poor mobility
  poor_mobility: boolean;
  // Previous cardiac surgery
  previous_cardiac_surgery: number; // 0, 1, 2+
  // Chronic lung disease
  chronic_lung_disease: boolean;
  // Active endocarditis
  active_endocarditis: boolean;
  // Critical preoperative state
  critical_preoperative: boolean;
  // Cardiac factors
  // LVEF
  lvef: "good" | "moderate" | "poor" | "very_poor"; // >50, 31-50, 21-30, ≤20
  // Recent MI
  recent_mi: boolean; // within 90 days
  // Pulmonary hypertension
  pulmonary_hypertension: "none" | "moderate" | "severe"; // <31, 31-55, >55 mmHg
  // Active IE
  // Operation factors
  urgency: "elective" | "urgent" | "emergency" | "salvage";
  weight_of_procedure: "isolated_cabg" | "single_non_cabg" | "two_procedures" | "three_or_more";
  surgery_on_thoracic_aorta: boolean;
}

interface EuroScoreResult {
  logistic_mortality: number; // %
  risk_category: "Low" | "Intermediate" | "High";
  components: Record<string, number>;
}

export function calculateEuroScore(inputs: EuroScoreInputs): EuroScoreResult {
  // EuroSCORE II uses logistic regression. We use the published coefficients.
  // Reference: Nashef et al. EuroSCORE II. Eur J Cardiothorac Surg. 2012.

  const components: Record<string, number> = {};

  // Age (per 5 years over 60, so if age<60 → 0)
  const age_factor = Math.max(0, (inputs.age - 60) / 5);
  components.age = 0.0285181 * age_factor;

  // Female
  components.female = inputs.female ? 0.2196434 : 0;

  // Creatinine (CKD: if creatinine >200 µmol/L)
  let creat_umol: number | null = null;
  if (inputs.use_umol && inputs.creatinine_umol !== null) {
    creat_umol = inputs.creatinine_umol;
  } else if (inputs.creatinine_mgdl !== null) {
    creat_umol = inputs.creatinine_mgdl * 88.4;
  }
  components.ckd = creat_umol !== null && creat_umol > 200 ? 0.6521653 : 0;

  // Dialysis
  components.dialysis = 0; // not in our inputs but left for completeness

  // Extra-cardiac arteriopathy
  components.extra_cardiac = inputs.extra_cardiac_arteriopathy ? 0.5360268 : 0;

  // Poor mobility
  components.poor_mobility = inputs.poor_mobility ? 0.2407181 : 0;

  // Previous cardiac surgery
  if (inputs.previous_cardiac_surgery === 1) components.previous_surgery = 1.118599;
  else if (inputs.previous_cardiac_surgery >= 2) components.previous_surgery = 1.118599 * 1.5;
  else components.previous_surgery = 0;

  // Chronic lung disease
  components.copd = inputs.chronic_lung_disease ? 0.1886564 : 0;

  // Active endocarditis
  components.endocarditis = inputs.active_endocarditis ? 0.6194522 : 0;

  // Critical preoperative state
  components.critical = inputs.critical_preoperative ? 1.086517 : 0;

  // LVEF
  if (inputs.lvef === "moderate") components.lvef = 0.3150652;
  else if (inputs.lvef === "poor") components.lvef = 0.8084096;
  else if (inputs.lvef === "very_poor") components.lvef = 0.9346919;
  else components.lvef = 0;

  // Recent MI
  components.recent_mi = inputs.recent_mi ? 0.1528943 : 0;

  // Pulmonary hypertension
  if (inputs.pulmonary_hypertension === "moderate") components.pulm_htn = 0.1788899;
  else if (inputs.pulmonary_hypertension === "severe") components.pulm_htn = 0.3491475;
  else components.pulm_htn = 0;

  // Urgency
  if (inputs.urgency === "urgent") components.urgency = 0.3174673;
  else if (inputs.urgency === "emergency") components.urgency = 0.7039121;
  else if (inputs.urgency === "salvage") components.urgency = 1.362947;
  else components.urgency = 0;

  // Weight of procedure
  if (inputs.weight_of_procedure === "single_non_cabg") components.procedure = 0.0062118;
  else if (inputs.weight_of_procedure === "two_procedures") components.procedure = 0.5521478;
  else if (inputs.weight_of_procedure === "three_or_more") components.procedure = 0.9724533;
  else components.procedure = 0; // isolated CABG

  // Surgery on thoracic aorta
  components.thoracic_aorta = inputs.surgery_on_thoracic_aorta ? 0.6527205 : 0;

  const beta = Object.values(components).reduce((a, b) => a + b, 0);
  const intercept = -5.324537;
  const log_odds = intercept + beta;
  const mortality = (1 / (1 + Math.exp(-log_odds))) * 100;

  let risk_category: "Low" | "Intermediate" | "High";
  if (mortality < 2) risk_category = "Low";
  else if (mortality < 5) risk_category = "Intermediate";
  else risk_category = "High";

  return { logistic_mortality: mortality, risk_category, components };
}
