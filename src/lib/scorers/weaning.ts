export interface WeaningInputs {
  // RSBI
  respiratory_rate: number | null;   // breaths/min (spontaneous)
  tidal_volume_ml: number | null;    // mL (spontaneous, unassisted)
  // P0.1 (airway occlusion pressure at 0.1s)
  p01: number | null;                // cmH2O (negative value, e.g. -3.5)
  // Oxygenation
  spo2: number | null;               // %
  fio2: number | null;               // fraction 0.21–1.0
  peep: number | null;               // cmH2O
  // Drive
  mip: number | null;                // MIP/NIF cmH2O (negative, e.g. -25)
  // Clinical
  gcs: number | null;
  cough_strength: "strong" | "weak" | "absent";
  secretions: "minimal" | "moderate" | "copious";
  cause_of_intubation_resolved: boolean;
  hemodynamically_stable: boolean;
  no_vasopressors: boolean;
  spontaneous_breathing_trial_passed: boolean;
  // SBT duration minutes (optional)
  sbt_duration_min: number | null;
}

export interface WeaningResult {
  rsbi: number | null;
  rsbi_pass: boolean | null;
  p01_pass: boolean | null;
  spo2_fio2: number | null;
  oxygenation_pass: boolean | null;
  mip_pass: boolean | null;
  clinical_score: number;           // 0–6
  readiness: "Ready" | "Borderline" | "Not Ready";
  recommendation: string;
  details: {
    rsbi_label: string;
    p01_label: string;
    oxygenation_label: string;
    mip_label: string;
    clinical_label: string;
  };
}

export function calculateWeaning(inputs: WeaningInputs): WeaningResult {
  // --- RSBI ---
  let rsbi: number | null = null;
  let rsbi_pass: boolean | null = null;
  if (inputs.respiratory_rate !== null && inputs.tidal_volume_ml !== null && inputs.tidal_volume_ml > 0) {
    rsbi = inputs.respiratory_rate / (inputs.tidal_volume_ml / 1000); // breaths/min/L
    rsbi_pass = rsbi < 105;
  }

  // --- P0.1 ---
  let p01_pass: boolean | null = null;
  if (inputs.p01 !== null) {
    p01_pass = Math.abs(inputs.p01) <= 4.0; // normal ≤4 cmH2O
  }

  // --- Oxygenation ---
  let spo2_fio2: number | null = null;
  let oxygenation_pass: boolean | null = null;
  if (inputs.spo2 !== null && inputs.fio2 !== null && inputs.fio2 > 0) {
    spo2_fio2 = inputs.spo2 / inputs.fio2;
    const peep_ok = inputs.peep !== null ? inputs.peep <= 8 : true;
    oxygenation_pass = spo2_fio2 >= 150 && peep_ok && inputs.fio2 <= 0.5;
  }

  // --- MIP (Maximal Inspiratory Pressure) ---
  let mip_pass: boolean | null = null;
  if (inputs.mip !== null) {
    mip_pass = Math.abs(inputs.mip) >= 20; // need at least -20 cmH2O
  }

  // --- Clinical readiness score (0–6) ---
  let clinical_score = 0;
  if (inputs.cause_of_intubation_resolved) clinical_score++;
  if (inputs.hemodynamically_stable) clinical_score++;
  if (inputs.no_vasopressors) clinical_score++;
  if (inputs.gcs !== null && inputs.gcs >= 8) clinical_score++;
  if (inputs.cough_strength === "strong") clinical_score++;
  else if (inputs.cough_strength === "weak") clinical_score += 0.5;
  if (inputs.secretions === "minimal") clinical_score++;
  else if (inputs.secretions === "moderate") clinical_score += 0.5;

  // --- Overall readiness ---
  const passes = [rsbi_pass, p01_pass, oxygenation_pass, mip_pass].filter(x => x !== null);
  const passCount = passes.filter(x => x === true).length;
  const total_tests = passes.length;

  let readiness: "Ready" | "Borderline" | "Not Ready";
  let recommendation: string;

  const sbt_ok = inputs.spontaneous_breathing_trial_passed;
  const clinical_ok = clinical_score >= 4;

  if (sbt_ok && clinical_ok && (total_tests === 0 || passCount >= total_tests - 1)) {
    readiness = "Ready";
    recommendation = "Proceed to extubation. Ensure post-extubation monitoring.";
  } else if (clinical_ok && passCount >= Math.ceil(total_tests / 2)) {
    readiness = "Borderline";
    recommendation = "Consider SBT if not done. Reassess in 2–4 hours.";
  } else {
    readiness = "Not Ready";
    recommendation = "Continue ventilatory support. Address underlying issues.";
  }

  return {
    rsbi,
    rsbi_pass,
    p01_pass,
    spo2_fio2,
    oxygenation_pass,
    mip_pass,
    clinical_score,
    readiness,
    recommendation,
    details: {
      rsbi_label: rsbi !== null ? `${rsbi.toFixed(0)} br/min/L (${rsbi_pass ? "✓ <105" : "✗ ≥105"})` : "N/A",
      p01_label: inputs.p01 !== null ? `${inputs.p01} cmH₂O (${p01_pass ? "✓ ≤4" : "✗ >4"})` : "N/A",
      oxygenation_label: spo2_fio2 !== null ? `SpO₂/FiO₂ ${spo2_fio2.toFixed(0)} (${oxygenation_pass ? "✓" : "✗"})` : "N/A",
      mip_label: inputs.mip !== null ? `${inputs.mip} cmH₂O (${mip_pass ? "✓ ≤−20" : "✗ >−20"})` : "N/A",
      clinical_label: `${clinical_score.toFixed(0)}/6`,
    },
  };
}
