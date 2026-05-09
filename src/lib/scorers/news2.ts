import { VitalSigns, NEWS2Result } from "@/types";

export function calculateNEWS2(vitals: VitalSigns): NEWS2Result {
  const components = { respiratory_rate: 0, spo2: 0, supplemental_oxygen: 0, systolic_bp: 0, heart_rate: 0, temperature: 0, alert_status: 0 };
  const rr = vitals.respiratory_rate;
  if (rr !== null && rr !== undefined) {
    if (rr <= 8) components.respiratory_rate = 3;
    else if (rr <= 11) components.respiratory_rate = 1;
    else if (rr <= 20) components.respiratory_rate = 0;
    else if (rr <= 24) components.respiratory_rate = 2;
    else components.respiratory_rate = 3;
  }
  const spo2 = vitals.spo2;
  if (spo2 !== null && spo2 !== undefined) {
    if (spo2 <= 91) components.spo2 = 3;
    else if (spo2 <= 93) components.spo2 = 2;
    else if (spo2 <= 95) components.spo2 = 1;
    else components.spo2 = 0;
  }
  if (vitals.supplemental_oxygen) components.supplemental_oxygen = 2;
  const sbp = vitals.systolic_bp;
  if (sbp !== null && sbp !== undefined) {
    if (sbp <= 90) components.systolic_bp = 3;
    else if (sbp <= 100) components.systolic_bp = 2;
    else if (sbp <= 110) components.systolic_bp = 1;
    else if (sbp <= 219) components.systolic_bp = 0;
    else components.systolic_bp = 3;
  }
  const hr = vitals.heart_rate;
  if (hr !== null && hr !== undefined) {
    if (hr === 0) components.heart_rate = 3;
    else if (hr <= 40) components.heart_rate = 3;
    else if (hr <= 50) components.heart_rate = 1;
    else if (hr <= 90) components.heart_rate = 0;
    else if (hr <= 110) components.heart_rate = 1;
    else if (hr <= 130) components.heart_rate = 2;
    else components.heart_rate = 3;
  }
  const temp = vitals.temperature;
  if (temp !== null && temp !== undefined) {
    if (temp <= 35.0) components.temperature = 3;
    else if (temp <= 36.0) components.temperature = 1;
    else if (temp <= 38.0) components.temperature = 0;
    else if (temp <= 39.0) components.temperature = 1;
    else components.temperature = 2;
  }
  const alert = vitals.alert_status?.toLowerCase();
  components.alert_status = alert === "alert" ? 0 : 3;
  const total = Object.values(components).reduce((a, b) => a + b, 0);
  let risk_level: "Low" | "Medium" | "High";
  let recommendation: string;
  if (total <= 4) { risk_level = "Low"; recommendation = "Routine monitoring"; }
  else if (total <= 6) { risk_level = "Medium"; recommendation = "Increased monitoring frequency"; }
  else { risk_level = "High"; recommendation = "Urgent clinical review required"; }
  return { total, risk_level, recommendation, components };
}