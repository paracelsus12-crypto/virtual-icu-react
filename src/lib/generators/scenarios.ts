export type { PatientRecord } from "@/types";

// ─────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────
function randn(mean: number, std: number): number {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * std;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

import type { PatientRecord } from "@/types";

function getAlertStatus(sbp: number, spo2: number, hr: number): PatientRecord["alert_status"] {
  if (sbp < 70 || spo2 < 80 || hr === 0) return "Unresponsive";
  if (sbp < 90 || spo2 < 88) return "Lethargic";
  if (sbp < 100 || spo2 < 92) return "Confused";
  return "Alert";
}

function samples(hours: number, stepMin = 5): number {
  return Math.floor((hours * 60) / stepMin);
}

// ─────────────────────────────────────────────────────────────
// EXISTING (збережено)
// ─────────────────────────────────────────────────────────────
export function generateHypotension(variant: "progressive" | "sudden" = "progressive"): PatientRecord[] {
  const n = samples(6);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    let sbp: number, hr: number;
    if (variant === "sudden") {
      if (p < 0.2) { sbp = randn(130, 3); hr = randn(75, 2); }
      else { sbp = 50 + (p - 0.2) * 40 + randn(0, 5); hr = 150 - (p - 0.2) * 40 + randn(0, 3); }
    } else {
      sbp = 114 - p * 64 + randn(0, 3);
      hr = 79 + p * 80 + randn(0, 2);
    }
    sbp = clamp(sbp, 30, 180); hr = clamp(hr, 40, 200);
    const spo2 = clamp(98 - p * 15 + randn(0, 1), 75, 100);
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(hr), systolic_bp: Math.round(sbp * 10) / 10,
      diastolic_bp: Math.round(sbp * 0.5 * 10) / 10,
      respiratory_rate: Math.round(clamp(16 + p * 15 + randn(0, 1), 8, 40)),
      spo2: Math.round(spo2 * 10) / 10,
      temperature: Math.round((37 - p * 1 + randn(0, 0.2)) * 10) / 10,
      alert_status: getAlertStatus(sbp, spo2, hr),
      supplemental_oxygen: p > 0.3, age: 65,
    };
  });
}

export function generateCardiacArrest(withROSC = false): PatientRecord[] {
  const n = samples(4);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    let hr: number, sbp: number, spo2: number;
    if (withROSC) {
      if (p < 0.3) { hr = randn(80, 5); sbp = randn(120, 5); spo2 = randn(97, 1); }
      else if (p < 0.5) { hr = 0; sbp = clamp(randn(20, 5), 10, 40); spo2 = clamp(randn(60, 5), 50, 75); }
      else if (p < 0.6) { hr = clamp(randn(50, 10), 30, 80); sbp = clamp(randn(60, 10), 40, 90); spo2 = clamp(randn(80, 5), 70, 90); }
      else { hr = clamp(randn(90, 10), 60, 130); sbp = clamp(randn(95, 10), 70, 130); spo2 = clamp(randn(94, 2), 88, 100); }
    } else {
      if (p < 0.25) { hr = randn(80, 5); sbp = randn(120, 5); spo2 = randn(97, 1); }
      else { hr = 0; sbp = clamp(20 + p * 10 + randn(0, 3), 10, 50); spo2 = clamp(60 - p * 10 + randn(0, 3), 50, 75); }
    }
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(clamp(hr, 0, 250)), systolic_bp: Math.round(clamp(sbp, 10, 200) * 10) / 10,
      diastolic_bp: Math.round(clamp(sbp * 0.5, 5, 100) * 10) / 10,
      respiratory_rate: Math.round(clamp(16 + p * 14 + randn(0, 1), 0, 40)),
      spo2: Math.round(clamp(spo2, 50, 100) * 10) / 10,
      temperature: Math.round((37 - p * 0.5 + randn(0, 0.1)) * 10) / 10,
      alert_status: getAlertStatus(sbp, spo2, hr),
      supplemental_oxygen: p > 0.2, age: 65,
    };
  });
}

export function generateAtrialFibrillation(): PatientRecord[] {
  const n = samples(4);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    const hr = clamp(167 - p * 40 + randn(0, 8), 60, 200);
    const sbp = clamp(118 - p * 20 + randn(0, 5), 70, 160);
    const spo2 = clamp(95 - p * 3 + randn(0, 1), 85, 100);
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(hr), systolic_bp: Math.round(sbp * 10) / 10,
      diastolic_bp: Math.round(sbp * 0.55 * 10) / 10,
      respiratory_rate: Math.round(clamp(16 + p * 6 + randn(0, 1), 12, 30)),
      spo2: Math.round(spo2 * 10) / 10,
      temperature: Math.round((36.8 + randn(0, 0.2)) * 10) / 10,
      alert_status: getAlertStatus(sbp, spo2, hr),
      supplemental_oxygen: p > 0.5, age: 65,
    };
  });
}

export function generateSepticShock(): PatientRecord[] {
  const n = samples(6);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    const hr = clamp(90 + p * 50 + randn(0, 5), 60, 180);
    const sbp = clamp(120 - p * 50 + randn(0, 5), 50, 150);
    const spo2 = clamp(98 - p * 12 + randn(0, 1), 78, 100);
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(hr), systolic_bp: Math.round(sbp * 10) / 10,
      diastolic_bp: Math.round(sbp * 0.5 * 10) / 10,
      respiratory_rate: Math.round(clamp(16 + p * 14 + randn(0, 1), 10, 40)),
      spo2: Math.round(spo2 * 10) / 10,
      temperature: Math.round((38.5 + p * 1.5 + randn(0, 0.3)) * 10) / 10,
      alert_status: getAlertStatus(sbp, spo2, hr),
      supplemental_oxygen: p > 0.2, age: 65,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// СЕПСИС (Sepsis-3)
// ─────────────────────────────────────────────────────────────

/** Sepsis-3: SIRS + органна дисфункція (SOFA ≥2).
 *  Початок: субфебрилітет, тахікардія, тахіпное.
 *  Прогресія: гіпотензія, порушення свідомості, SpO2↓ */
export function generateSepsis3(): PatientRecord[] {
  const n = samples(8);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    const hr = clamp(95 + p * 45 + randn(0, 5), 60, 175);
    const sbp = clamp(125 - p * 40 + randn(0, 4), 65, 145);
    const rr = clamp(18 + p * 14 + randn(0, 1), 12, 38);
    const spo2 = clamp(97 - p * 8 + randn(0, 1), 84, 100);
    const temp = p < 0.4
      ? clamp(38.2 + p * 2 + randn(0, 0.2), 37.5, 40.5)   // гіпертермія
      : clamp(40.4 - (p - 0.4) * 5 + randn(0, 0.3), 35.5, 41); // потім гіпотермія
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(hr), systolic_bp: Math.round(sbp * 10) / 10,
      diastolic_bp: Math.round(sbp * 0.45 * 10) / 10,
      respiratory_rate: Math.round(rr),
      spo2: Math.round(spo2 * 10) / 10,
      temperature: Math.round(temp * 10) / 10,
      alert_status: getAlertStatus(sbp, spo2, hr),
      supplemental_oxygen: p > 0.25, age: 68,
    };
  });
}

/** Сепсис → відповідь на антибіотики та інфузію (поліпшення) */
export function generateSepsisWithRecovery(): PatientRecord[] {
  const n = samples(10);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    // Погіршення до 40%, потім відповідь на лікування
    const phase = p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6;
    const hr = clamp(95 + phase * 50 + randn(0, 4), 60, 160);
    const sbp = clamp(125 - phase * 38 + randn(0, 4), 70, 140);
    const spo2 = clamp(97 - phase * 9 + randn(0, 1), 86, 100);
    const temp = p < 0.4
      ? clamp(37.5 + phase * 2.5 + randn(0, 0.2), 37, 40.5)
      : clamp(40 - (p - 0.4) * 3 + randn(0, 0.2), 36.5, 40.5);
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(hr), systolic_bp: Math.round(sbp * 10) / 10,
      diastolic_bp: Math.round(sbp * 0.45 * 10) / 10,
      respiratory_rate: Math.round(clamp(17 + phase * 12 + randn(0, 1), 12, 36)),
      spo2: Math.round(spo2 * 10) / 10,
      temperature: Math.round(temp * 10) / 10,
      alert_status: getAlertStatus(sbp, spo2, hr),
      supplemental_oxygen: phase > 0.3, age: 68,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// ДИХАЛЬНА НЕДОСТАТНІСТЬ
// ─────────────────────────────────────────────────────────────

/** ДН 1 типу: гіпоксемічна (PaO2↓, PaCO2 норма/↓).
 *  SpO2 прогресивно падає, тахіпное, АТ відносно збережений */
export function generateRespiratoryFailureType1(): PatientRecord[] {
  const n = samples(6);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    const spo2 = clamp(97 - p * 22 + randn(0, 1), 70, 100);
    const rr = clamp(18 + p * 20 + randn(0, 1), 14, 42);
    const hr = clamp(78 + p * 35 + randn(0, 3), 60, 155);
    const sbp = clamp(128 - p * 20 + randn(0, 4), 80, 150);
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(hr), systolic_bp: Math.round(sbp * 10) / 10,
      diastolic_bp: Math.round(sbp * 0.6 * 10) / 10,
      respiratory_rate: Math.round(rr),
      spo2: Math.round(spo2 * 10) / 10,
      temperature: Math.round((37.2 + randn(0, 0.2)) * 10) / 10,
      alert_status: getAlertStatus(sbp, spo2, hr),
      supplemental_oxygen: p > 0.15, age: 62,
    };
  });
}

/** ДН 2 типу: гіперкапнічна (PaCO2↑, pH↓).
 *  Тахіпное + брадипное в кінці, сонливість (CO2-наркоз), ціаноз */
export function generateRespiratoryFailureType2(): PatientRecord[] {
  const n = samples(6);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    // CO2-наркоз: спочатку тахіпное, потім пригнічення дихання
    const rr = p < 0.5
      ? clamp(22 + p * 16 + randn(0, 1), 16, 38)
      : clamp(30 - (p - 0.5) * 40 + randn(0, 1), 6, 30);
    const spo2 = clamp(95 - p * 18 + randn(0, 1), 72, 100);
    const hr = clamp(82 + p * 28 + randn(0, 3), 50, 130);
    const sbp = clamp(135 + p * 15 + randn(0, 5), 90, 180); // гіпертензія від CO2
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(hr), systolic_bp: Math.round(sbp * 10) / 10,
      diastolic_bp: Math.round(sbp * 0.6 * 10) / 10,
      respiratory_rate: Math.round(rr),
      spo2: Math.round(spo2 * 10) / 10,
      temperature: Math.round((37.0 + randn(0, 0.2)) * 10) / 10,
      alert_status: p > 0.6 ? (spo2 < 85 ? "Lethargic" : "Confused") : getAlertStatus(sbp, spo2, hr),
      supplemental_oxygen: p > 0.1, age: 70,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// ГІПОКСІЯ
// ─────────────────────────────────────────────────────────────

/** Гостра гіпоксія: раптове падіння SpO2 (напр. обструкція, пневмоторакс) */
export function generateAcuteHypoxia(): PatientRecord[] {
  const n = samples(3);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    const spo2 = p < 0.15
      ? clamp(98 - randn(0, 0.5), 96, 100)
      : clamp(98 - (p - 0.15) / 0.85 * 35 + randn(0, 1.5), 60, 100);
    const hr = clamp(75 + p * 60 + randn(0, 4), 60, 180);
    const sbp = clamp(125 - p * 25 + randn(0, 5), 80, 145);
    const rr = clamp(16 + p * 24 + randn(0, 1), 10, 44);
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(hr), systolic_bp: Math.round(sbp * 10) / 10,
      diastolic_bp: Math.round(sbp * 0.6 * 10) / 10,
      respiratory_rate: Math.round(rr),
      spo2: Math.round(spo2 * 10) / 10,
      temperature: Math.round((37.0 + randn(0, 0.1)) * 10) / 10,
      alert_status: getAlertStatus(sbp, spo2, hr),
      supplemental_oxygen: p > 0.1, age: 55,
    };
  });
}

/** Поступова гіпоксія: повільна десатурація (напр. ХОЗЛ-загострення, плевральний випіт) */
export function generateGradualHypoxia(): PatientRecord[] {
  const n = samples(12);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    const spo2 = clamp(96 - p * 18 + randn(0, 0.8), 74, 100);
    const rr = clamp(17 + p * 13 + randn(0, 1), 12, 34);
    const hr = clamp(76 + p * 28 + randn(0, 3), 55, 130);
    const sbp = clamp(130 - p * 15 + randn(0, 4), 95, 148);
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(hr), systolic_bp: Math.round(sbp * 10) / 10,
      diastolic_bp: Math.round(sbp * 0.62 * 10) / 10,
      respiratory_rate: Math.round(rr),
      spo2: Math.round(spo2 * 10) / 10,
      temperature: Math.round((37.1 + randn(0, 0.2)) * 10) / 10,
      alert_status: getAlertStatus(sbp, spo2, hr),
      supplemental_oxygen: p > 0.3, age: 72,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// ТАХІАРИТМІЇ
// ─────────────────────────────────────────────────────────────

/** Шлуночкова тахікардія (ШТ): ЧСС 150–220, нестабільна гемодинаміка */
export function generateVentricularTachycardia(stable = true): PatientRecord[] {
  const n = samples(3);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    // Раптовий початок ШТ
    const inVT = p > 0.1;
    const hr = inVT
      ? clamp(randn(stable ? 175 : 200, 8), 150, 230)
      : randn(82, 5);
    const sbp = inVT
      ? clamp((stable ? 95 : 60) - p * (stable ? 10 : 20) + randn(0, 6), stable ? 70 : 40, 115)
      : randn(128, 5);
    const spo2 = inVT
      ? clamp((stable ? 93 : 82) - p * (stable ? 3 : 8) + randn(0, 1), 70, 100)
      : randn(98, 0.5);
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(hr), systolic_bp: Math.round(sbp * 10) / 10,
      diastolic_bp: Math.round(sbp * 0.5 * 10) / 10,
      respiratory_rate: Math.round(clamp(16 + (inVT ? p * 12 : 0) + randn(0, 1), 10, 36)),
      spo2: Math.round(spo2 * 10) / 10,
      temperature: Math.round((37.0 + randn(0, 0.1)) * 10) / 10,
      alert_status: getAlertStatus(sbp, spo2, hr),
      supplemental_oxygen: inVT, age: 68,
    };
  });
}

/** Надшлуночкова тахікардія (НШТ/СВТ): раптовий початок, ЧСС 150–220,
 *  АТ відносно збережений, спонтанне відновлення або після аденозину */
export function generateSVT(withConversion = true): PatientRecord[] {
  const n = samples(4);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    const inSVT = p > 0.1 && (withConversion ? p < 0.8 : true);
    const hr = inSVT ? clamp(randn(188, 8), 160, 220) : randn(78, 5);
    const sbp = inSVT
      ? clamp(110 - p * 15 + randn(0, 5), 85, 125)
      : randn(128, 5);
    const spo2 = inSVT
      ? clamp(95 - p * 3 + randn(0, 1), 88, 100)
      : randn(98, 0.5);
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(hr), systolic_bp: Math.round(sbp * 10) / 10,
      diastolic_bp: Math.round(sbp * 0.6 * 10) / 10,
      respiratory_rate: Math.round(clamp(16 + (inSVT ? 6 : 0) + randn(0, 1), 12, 28)),
      spo2: Math.round(spo2 * 10) / 10,
      temperature: Math.round((36.9 + randn(0, 0.1)) * 10) / 10,
      alert_status: getAlertStatus(sbp, spo2, hr),
      supplemental_oxygen: inSVT && p > 0.5, age: 52,
    };
  });
}

/** Тріпотіння передсердь (Flutter): регулярна тахікардія ЧСС ~150 (2:1 блок) */
export function generateAtrialFlutter(): PatientRecord[] {
  const n = samples(4);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    // Flutter 2:1 → раптовий перехід у 4:1 після контролю ЧСС
    const hr = p < 0.6
      ? clamp(randn(150, 4), 140, 165)       // 2:1 блок ≈ 150
      : clamp(randn(78, 5), 65, 95);         // після бета-блокатора
    const sbp = clamp(118 - p * 15 + randn(0, 4), 90, 140);
    const spo2 = clamp(96 - p * 2 + randn(0, 0.8), 90, 100);
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(hr), systolic_bp: Math.round(sbp * 10) / 10,
      diastolic_bp: Math.round(sbp * 0.6 * 10) / 10,
      respiratory_rate: Math.round(clamp(16 + p * 4 + randn(0, 1), 12, 26)),
      spo2: Math.round(spo2 * 10) / 10,
      temperature: Math.round((36.9 + randn(0, 0.15)) * 10) / 10,
      alert_status: getAlertStatus(sbp, spo2, hr),
      supplemental_oxygen: false, age: 66,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// БРАДИКАРДІЯ
// ─────────────────────────────────────────────────────────────

/** Синусова брадикардія з поступовим погіршенням (AV-блок, медикаменти) */
export function generateBradycardia(variant: "sinus" | "av_block" | "complete" = "sinus"): PatientRecord[] {
  const n = samples(4);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    let hr: number;
    if (variant === "complete") {
      // Повна AV-блокада: раптове падіння до ідіовентрикулярного ритму 30–40
      hr = p < 0.2 ? randn(72, 4) : clamp(randn(35, 4), 25, 45);
    } else if (variant === "av_block") {
      // AV-блок 2 ступеня: прогресивне уповільнення
      hr = clamp(70 - p * 40 + randn(0, 3), 28, 80);
    } else {
      // Синусова брадикардія
      hr = clamp(68 - p * 30 + randn(0, 3), 35, 75);
    }
    const sbp = clamp(125 - p * 35 + randn(0, 4), 65, 145);
    const spo2 = clamp(97 - p * 6 + randn(0, 1), 84, 100);
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(hr), systolic_bp: Math.round(sbp * 10) / 10,
      diastolic_bp: Math.round(sbp * 0.6 * 10) / 10,
      respiratory_rate: Math.round(clamp(14 + p * 6 + randn(0, 1), 8, 24)),
      spo2: Math.round(spo2 * 10) / 10,
      temperature: Math.round((36.8 + randn(0, 0.15)) * 10) / 10,
      alert_status: getAlertStatus(sbp, spo2, hr),
      supplemental_oxygen: p > 0.5, age: 74,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// ІНШІ КРИТИЧНІ СТАНИ
// ─────────────────────────────────────────────────────────────

/** ТЕЛА (тромбоемболія легеневої артерії): гостра гіпоксія + тахікардія +
 *  відносно збережений АТ (масивна ТЕЛА → шок) */
export function generatePulmonaryEmbolism(massive = false): PatientRecord[] {
  const n = samples(5);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    const hr = clamp(85 + p * (massive ? 70 : 40) + randn(0, 5), 70, 180);
    const sbp = massive
      ? clamp(120 - p * 60 + randn(0, 5), 55, 130)
      : clamp(125 - p * 15 + randn(0, 4), 95, 140);
    const spo2 = clamp(97 - p * (massive ? 25 : 12) + randn(0, 1), 68, 100);
    const rr = clamp(18 + p * 16 + randn(0, 1), 14, 40);
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(hr), systolic_bp: Math.round(sbp * 10) / 10,
      diastolic_bp: Math.round(sbp * 0.5 * 10) / 10,
      respiratory_rate: Math.round(rr),
      spo2: Math.round(spo2 * 10) / 10,
      temperature: Math.round((37.1 + randn(0, 0.2)) * 10) / 10,
      alert_status: getAlertStatus(sbp, spo2, hr),
      supplemental_oxygen: p > 0.05, age: 60,
    };
  });
}

/** Гіпертонічний криз: АТС > 180, поступове зниження після лікування */
export function generateHypertensiveCrisis(): PatientRecord[] {
  const n = samples(6);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    // Лікування починається з 30%
    const treated = p > 0.3;
    const sbp = treated
      ? clamp(195 - (p - 0.3) / 0.7 * 80 + randn(0, 5), 115, 210)
      : clamp(175 + p * 20 + randn(0, 5), 160, 215);
    const hr = clamp(90 + p * 20 - (treated ? (p - 0.3) * 30 : 0) + randn(0, 4), 60, 130);
    const spo2 = clamp(97 - p * 3 + randn(0, 0.8), 90, 100);
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(hr), systolic_bp: Math.round(sbp * 10) / 10,
      diastolic_bp: Math.round(sbp * 0.65 * 10) / 10,
      respiratory_rate: Math.round(clamp(16 + p * 8 + randn(0, 1), 12, 28)),
      spo2: Math.round(spo2 * 10) / 10,
      temperature: Math.round((37.0 + randn(0, 0.15)) * 10) / 10,
      alert_status: getAlertStatus(sbp, spo2, hr),
      supplemental_oxygen: false, age: 58,
    };
  });
}

/** Анафілаксія: різке падіння АТ + тахікардія + десатурація */
export function generateAnaphylaxis(withTreatment = true): PatientRecord[] {
  const n = samples(3);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    const onset = p > 0.1;
    const recovering = withTreatment && p > 0.55;
    let hr: number, sbp: number, spo2: number;
    if (!onset) { hr = randn(78, 4); sbp = randn(128, 5); spo2 = randn(98, 0.5); }
    else if (recovering) {
      const r = (p - 0.55) / 0.45;
      hr = clamp(145 - r * 60 + randn(0, 5), 75, 155);
      sbp = clamp(55 + r * 70 + randn(0, 6), 55, 128);
      spo2 = clamp(82 + r * 15 + randn(0, 1), 82, 99);
    } else {
      hr = clamp(140 + p * 20 + randn(0, 6), 110, 170);
      sbp = clamp(128 - (p - 0.1) / 0.45 * 75 + randn(0, 6), 50, 130);
      spo2 = clamp(98 - (p - 0.1) / 0.45 * 18 + randn(0, 1.5), 78, 100);
    }
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(hr), systolic_bp: Math.round(sbp * 10) / 10,
      diastolic_bp: Math.round(sbp * 0.45 * 10) / 10,
      respiratory_rate: Math.round(clamp(16 + (onset && !recovering ? p * 20 : 0) + randn(0, 1), 12, 40)),
      spo2: Math.round(spo2 * 10) / 10,
      temperature: Math.round((37.2 + randn(0, 0.2)) * 10) / 10,
      alert_status: getAlertStatus(sbp, spo2, hr),
      supplemental_oxygen: onset, age: 38,
    };
  });
}

/** Гіпоглікемія: тахікардія, пітливість, порушення свідомості */
export function generateHypoglycemia(): PatientRecord[] {
  const n = samples(4);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    const hr = clamp(75 + p * 45 + randn(0, 4), 60, 140);
    const sbp = clamp(130 - p * 10 + randn(0, 5), 100, 150);
    const spo2 = clamp(98 - p * 2 + randn(0, 0.5), 94, 100);
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(hr), systolic_bp: Math.round(sbp * 10) / 10,
      diastolic_bp: Math.round(sbp * 0.65 * 10) / 10,
      respiratory_rate: Math.round(clamp(14 + p * 6 + randn(0, 1), 10, 24)),
      spo2: Math.round(spo2 * 10) / 10,
      temperature: Math.round((36.5 + randn(0, 0.2)) * 10) / 10,
      alert_status: p > 0.6 ? "Confused" : p > 0.8 ? "Lethargic" : "Alert",
      supplemental_oxygen: false, age: 55,
    };
  });
}

/** Набряк легень (гострий кардіогенний): різка десатурація + тахіпное + тахікардія */
export function generatePulmonaryEdema(): PatientRecord[] {
  const n = samples(5);
  return Array.from({ length: n }, (_, i) => {
    const p = i / (n - 1);
    const treated = p > 0.4;
    const spo2 = treated
      ? clamp(78 + (p - 0.4) / 0.6 * 16 + randn(0, 1), 78, 97)
      : clamp(98 - p / 0.4 * 20 + randn(0, 1.5), 76, 100);
    const rr = treated
      ? clamp(38 - (p - 0.4) / 0.6 * 18 + randn(0, 1), 16, 40)
      : clamp(16 + p / 0.4 * 24 + randn(0, 1), 14, 44);
    const hr = treated
      ? clamp(130 - (p - 0.4) / 0.6 * 35 + randn(0, 4), 80, 145)
      : clamp(82 + p / 0.4 * 50 + randn(0, 4), 75, 155);
    const sbp = clamp(155 - p * 40 + randn(0, 6), 90, 180);
    return {
      time_hours: i * 5 / 60,
      heart_rate: Math.round(hr), systolic_bp: Math.round(sbp * 10) / 10,
      diastolic_bp: Math.round(sbp * 0.6 * 10) / 10,
      respiratory_rate: Math.round(rr),
      spo2: Math.round(spo2 * 10) / 10,
      temperature: Math.round((37.0 + randn(0, 0.2)) * 10) / 10,
      alert_status: getAlertStatus(sbp, spo2, hr),
      supplemental_oxygen: p > 0.05, age: 72,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// DEMO_SCENARIOS — згруповані
// ─────────────────────────────────────────────────────────────
export interface ScenarioGroup {
  group: string;
  scenarios: { label: string; fn: () => PatientRecord[] }[];
}

export const SCENARIO_GROUPS: ScenarioGroup[] = [
  {
    group: "🩸 Гемодинаміка",
    scenarios: [
      { label: "Гіпотензія прогресивна", fn: () => generateHypotension("progressive") },
      { label: "Гіпотензія раптова", fn: () => generateHypotension("sudden") },
      { label: "Гіпертонічний криз", fn: () => generateHypertensiveCrisis() },
      { label: "Зупинка серця", fn: () => generateCardiacArrest(false) },
      { label: "Зупинка серця + ROSC", fn: () => generateCardiacArrest(true) },
      { label: "Анафілаксія (з лікуванням)", fn: () => generateAnaphylaxis(true) },
      { label: "Анафілаксія (без лікування)", fn: () => generateAnaphylaxis(false) },
    ],
  },
  {
    group: "🫁 Дихання та оксигенація",
    scenarios: [
      { label: "ДН 1 типу (гіпоксемічна)", fn: () => generateRespiratoryFailureType1() },
      { label: "ДН 2 типу (гіперкапнічна)", fn: () => generateRespiratoryFailureType2() },
      { label: "Гостра гіпоксія", fn: () => generateAcuteHypoxia() },
      { label: "Поступова гіпоксія", fn: () => generateGradualHypoxia() },
      { label: "Набряк легень", fn: () => generatePulmonaryEdema() },
      { label: "ТЕЛА субмасивна", fn: () => generatePulmonaryEmbolism(false) },
      { label: "ТЕЛА масивна", fn: () => generatePulmonaryEmbolism(true) },
    ],
  },
  {
    group: "❤️ Аритмії",
    scenarios: [
      { label: "Фібриляція передсердь", fn: () => generateAtrialFibrillation() },
      { label: "Тріпотіння передсердь", fn: () => generateAtrialFlutter() },
      { label: "НШТ (СВТ) з конверсією", fn: () => generateSVT(true) },
      { label: "НШТ (СВТ) без конверсії", fn: () => generateSVT(false) },
      { label: "ШТ стабільна", fn: () => generateVentricularTachycardia(true) },
      { label: "ШТ нестабільна", fn: () => generateVentricularTachycardia(false) },
      { label: "Синусова брадикардія", fn: () => generateBradycardia("sinus") },
      { label: "AV-блок 2 ступеня", fn: () => generateBradycardia("av_block") },
      { label: "Повна AV-блокада", fn: () => generateBradycardia("complete") },
    ],
  },
  {
    group: "🦠 Сепсис та інфекція",
    scenarios: [
      { label: "Сепсис-3 (прогресування)", fn: () => generateSepsis3() },
      { label: "Сепсис-3 (відповідь на лікування)", fn: () => generateSepsisWithRecovery() },
      { label: "Септичний шок", fn: () => generateSepticShock() },
    ],
  },
  {
    group: "⚡ Метаболічні",
    scenarios: [
      { label: "Гіпоглікемія", fn: () => generateHypoglycemia() },
    ],
  },
];

// Плоский список для зворотної сумісності
export const DEMO_SCENARIOS = SCENARIO_GROUPS.flatMap(g => g.scenarios);
