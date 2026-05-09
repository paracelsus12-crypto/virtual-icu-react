import { VitalSigns, qSOFAResult } from "@/types";

export function calculateQSOFA(vitals: VitalSigns): qSOFAResult {
  const components = { altered_mentation: 0, respiratory_rate: 0, systolic_bp: 0 };
  const alert = vitals.alert_status?.toLowerCase();
  if (alert && alert !== "alert") components.altered_mentation = 1;
  const rr = vitals.respiratory_rate;
  if (rr !== null && rr !== undefined && rr >= 22) components.respiratory_rate = 1;
  const sbp = vitals.systolic_bp;
  if (sbp !== null && sbp !== undefined && sbp <= 100) components.systolic_bp = 1;
  const total = components.altered_mentation + components.respiratory_rate + components.systolic_bp;
  const sepsis_risk = total >= 2;
  const recommendation = sepsis_risk ? "High risk of sepsis - urgent assessment" : "Standard monitoring";
  return { total, sepsis_risk, recommendation, components };
}