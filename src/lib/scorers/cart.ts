import { VitalSigns, CARTResult } from "@/types";

export function calculateCART(vitals: VitalSigns): CARTResult {
  let score = 0;
  const age = vitals.age ?? 50;
  if (age < 43) score += 0;
  else if (age < 50) score += 1;
  else if (age < 60) score += 2;
  else if (age < 70) score += 3;
  else score += 4;
  const sbp = vitals.systolic_bp;
  if (sbp !== null && sbp !== undefined) {
    if (sbp >= 111) score += 0;
    else if (sbp >= 100) score += 1;
    else if (sbp >= 90) score += 2;
    else if (sbp >= 80) score += 3;
    else score += 4;
  }
  const hr = vitals.heart_rate;
  if (hr !== null && hr !== undefined) {
    if (hr === 0) score += 4;
    else if (hr < 60) score += 0;
    else if (hr < 100) score += 1;
    else if (hr < 110) score += 2;
    else if (hr < 120) score += 3;
    else score += 4;
  }
  const rr = vitals.respiratory_rate;
  if (rr !== null && rr !== undefined) {
    if (rr < 14) score += 0;
    else if (rr < 20) score += 1;
    else if (rr < 25) score += 2;
    else if (rr < 30) score += 3;
    else score += 4;
  }
  const alert = vitals.alert_status?.toLowerCase();
  score += alert === "alert" ? 0 : 4;
  let risk_category: "Low" | "Medium" | "High" | "Highest";
  let recommendation: string;
  if (score <= 7) { risk_category = "Low"; recommendation = "Standard monitoring"; }
  else if (score <= 13) { risk_category = "Medium"; recommendation = "Increased monitoring, consider ICU"; }
  else if (score <= 17) { risk_category = "High"; recommendation = "ICU monitoring recommended"; }
  else { risk_category = "Highest"; recommendation = "Urgent ICU admission and continuous monitoring"; }
  return { total: score, max_possible: 20, risk_category, percentile: Math.min(100, (score / 20) * 100), recommendation };
}