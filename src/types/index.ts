export interface VitalSigns {
  heart_rate: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  respiratory_rate: number | null;
  spo2: number | null;
  temperature: number | null;
  alert_status: "Alert" | "Confused" | "Lethargic" | "Unresponsive";
  age?: number;
  supplemental_oxygen?: boolean;
  time_hours?: number;
}

export interface PatientRecord extends VitalSigns {
  [key: string]: number | string | boolean | null | undefined;
}

export interface NEWS2Result {
  total: number;
  risk_level: "Low" | "Medium" | "High";
  recommendation: string;
  components: {
    respiratory_rate: number;
    spo2: number;
    supplemental_oxygen: number;
    systolic_bp: number;
    heart_rate: number;
    temperature: number;
    alert_status: number;
  };
}

export interface qSOFAResult {
  total: number;
  sepsis_risk: boolean;
  recommendation: string;
  components: { altered_mentation: number; respiratory_rate: number; systolic_bp: number; };
}

export interface CARTResult {
  total: number;
  max_possible: number;
  risk_category: "Low" | "Medium" | "High" | "Highest";
  percentile: number;
  recommendation: string;
}

export interface SOFAResult {
  total: number;
  mortality_range: string;
  components: { respiration: number; coagulation: number; liver: number; cardiovascular: number; cns: number; renal: number; };
}

export type NavigationSection = "monitoring" | "cardiac" | "clinical";
export type MonitoringTab = "dashboard" | "vitals" | "invigilator" | "forecast" | "report";
export type CardiacTab = "euroscore" | "ahf" | "iabp" | "mortality";
export type ClinicalTab = "scores" | "sofa" | "weaning" | "reexploration";