import { SOFAResult } from "@/types";

export interface SOFAInputs {
  // Respiration
  pao2_fio2: number | null;           // PaO2/FiO2 ratio
  on_mechanical_ventilation: boolean;
  // Coagulation
  platelets: number | null;           // ×10³/µL
  // Liver
  bilirubin_umol: number | null;      // µmol/L
  bilirubin_mgdl: number | null;      // mg/dL (альтернатива)
  use_umol: boolean;
  // Cardiovascular
  map: number | null;                 // Mean Arterial Pressure mmHg
  dopamine: number | null;            // µg/kg/min
  dobutamine: boolean;
  norepinephrine: number | null;      // µg/kg/min
  epinephrine: number | null;         // µg/kg/min
  // CNS
  gcs: number | null;                 // Glasgow Coma Scale 3–15
  // Renal
  creatinine_umol: number | null;     // µmol/L
  creatinine_mgdl: number | null;     // mg/dL
  urine_output_ml_day: number | null;
}

export function calculateSOFA(inputs: SOFAInputs): SOFAResult {
  const components = {
    respiration: 0,
    coagulation: 0,
    liver: 0,
    cardiovascular: 0,
    cns: 0,
    renal: 0,
  };

  // --- Respiration (PaO2/FiO2) ---
  if (inputs.pao2_fio2 !== null) {
    const r = inputs.pao2_fio2;
    if (r < 100 && inputs.on_mechanical_ventilation) components.respiration = 4;
    else if (r < 200 && inputs.on_mechanical_ventilation) components.respiration = 3;
    else if (r < 300) components.respiration = 2;
    else if (r < 400) components.respiration = 1;
  }

  // --- Coagulation (Platelets ×10³/µL) ---
  if (inputs.platelets !== null) {
    const p = inputs.platelets;
    if (p < 20) components.coagulation = 4;
    else if (p < 50) components.coagulation = 3;
    else if (p < 100) components.coagulation = 2;
    else if (p < 150) components.coagulation = 1;
  }

  // --- Liver (Bilirubin) ---
  let bili_mgdl: number | null = null;
  if (inputs.use_umol && inputs.bilirubin_umol !== null) {
    bili_mgdl = inputs.bilirubin_umol / 17.1;
  } else if (inputs.bilirubin_mgdl !== null) {
    bili_mgdl = inputs.bilirubin_mgdl;
  }
  if (bili_mgdl !== null) {
    if (bili_mgdl >= 12.0) components.liver = 4;
    else if (bili_mgdl >= 6.0) components.liver = 3;
    else if (bili_mgdl >= 2.0) components.liver = 2;
    else if (bili_mgdl >= 1.2) components.liver = 1;
  }

  // --- Cardiovascular ---
  const map = inputs.map;
  const dopa = inputs.dopamine ?? 0;
  const norepi = inputs.norepinephrine ?? 0;
  const epi = inputs.epinephrine ?? 0;
  const dobu = inputs.dobutamine;

  if (norepi > 0.1 || epi > 0.1) components.cardiovascular = 4;
  else if (norepi > 0 || epi > 0 || dopa > 15) components.cardiovascular = 3;
  else if (dopa > 5 || dobu) components.cardiovascular = 2;
  else if (dopa <= 5 && dopa > 0) components.cardiovascular = 1;
  else if (map !== null && map < 70) components.cardiovascular = 1;

  // --- CNS (GCS) ---
  if (inputs.gcs !== null) {
    const g = inputs.gcs;
    if (g < 6) components.cns = 4;
    else if (g < 10) components.cns = 3;
    else if (g < 13) components.cns = 2;
    else if (g < 15) components.cns = 1;
  }

  // --- Renal (Creatinine + Urine Output) ---
  let creat_mgdl: number | null = null;
  if (inputs.use_umol && inputs.creatinine_umol !== null) {
    creat_mgdl = inputs.creatinine_umol / 88.4;
  } else if (inputs.creatinine_mgdl !== null) {
    creat_mgdl = inputs.creatinine_mgdl;
  }

  let renal_score = 0;
  if (creat_mgdl !== null) {
    if (creat_mgdl >= 5.0) renal_score = 4;
    else if (creat_mgdl >= 3.5) renal_score = 3;
    else if (creat_mgdl >= 2.0) renal_score = 2;
    else if (creat_mgdl >= 1.2) renal_score = 1;
  }
  if (inputs.urine_output_ml_day !== null) {
    const uo = inputs.urine_output_ml_day;
    if (uo < 200) renal_score = Math.max(renal_score, 4);
    else if (uo < 500) renal_score = Math.max(renal_score, 3);
  }
  components.renal = renal_score;

  const total = Object.values(components).reduce((a, b) => a + b, 0);

  let mortality_range: string;
  if (total < 6) mortality_range = "<10%";
  else if (total < 10) mortality_range = "15–20%";
  else if (total < 13) mortality_range = "40–50%";
  else mortality_range = ">80%";

  return { total, mortality_range, components };
}
