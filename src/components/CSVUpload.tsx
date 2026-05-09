"use client";
import { useRef, useState } from "react";
import { PatientRecord } from "@/lib/generators/scenarios";

const HARD_REQUIRED = ["time_hours", "heart_rate"] as const;

function interpolate(arr: (number | null)[]): number[] {
  const result = [...arr] as (number | null)[];
  const first = result.findIndex(v => v !== null);
  if (first === -1) return result.map(() => 0) as number[];
  for (let i = 0; i < first; i++) result[i] = result[first];
  for (let i = 0; i < result.length; i++) {
    if (result[i] !== null) continue;
    let j = i + 1;
    while (j < result.length && result[j] === null) j++;
    const left = result[i - 1] as number;
    const right = j < result.length ? result[j] as number : left;
    for (let k = i; k < j; k++) {
      result[k] = left + (right - left) * ((k - i + 1) / (j - i + 1));
    }
    i = j - 1;
  }
  return result as number[];
}

function deriveAlertStatus(sbp: number, spo2: number, hr: number): PatientRecord["alert_status"] {
  if (sbp < 70 || spo2 < 80 || hr === 0) return "Unresponsive";
  if (sbp < 90 || spo2 < 88) return "Lethargic";
  if (sbp < 100 || spo2 < 92) return "Confused";
  return "Alert";
}

function parseCSV(text: string): { data: PatientRecord[]; warnings: string[] } {
  const warnings: string[] = [];
  const lines = text.trim().split(/\r?\n/);
  const rawHeaders = lines[0].replace(/^\uFEFF/, "");
  const headers = rawHeaders.split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());

  const missing = HARD_REQUIRED.filter(r => !headers.includes(r));
  if (missing.length > 0) throw new Error(`Відсутні обов'язкові стовпці: ${missing.join(", ")}`);

  const col = (name: string) => headers.indexOf(name);
  const rawRows = lines.slice(1).map(line => line.split(",").map(v => v.trim().replace(/^"|"$/g, "")));

  const parseCol = (colIdx: number): (number | null)[] =>
    colIdx === -1 ? rawRows.map(() => null)
    : rawRows.map(r => { const v = r[colIdx] ?? ""; return v === "" ? null : Number(v); });

  const th_arr   = parseCol(col("time_hours"));
  const hr_arr   = parseCol(col("heart_rate"));
  const sbp_arr  = parseCol(col("systolic_bp"));
  const dbp_arr  = parseCol(col("diastolic_bp"));
  const rr_arr   = parseCol(col("respiratory_rate"));
  const spo2_arr = parseCol(col("spo2"));
  const temp_arr = parseCol(col("temperature"));

  const warnAndInterp = (arr: (number | null)[], name: string, fallback: number): number[] => {
    if (arr.every(v => v === null)) {
      warnings.push(`«${name}» відсутній — використано ${fallback}`);
      return arr.map(() => fallback);
    }
    if (arr.some(v => v === null)) {
      const n = arr.filter(v => v === null).length;
      warnings.push(`«${name}»: ${n} пропущених — заповнено інтерполяцією`);
    }
    return interpolate(arr);
  };

  const th   = warnAndInterp(th_arr,   "time_hours",       0);
  const hr   = warnAndInterp(hr_arr,   "heart_rate",       75);
  const sbp  = warnAndInterp(sbp_arr,  "systolic_bp",      120);
  const dbp  = warnAndInterp(dbp_arr,  "diastolic_bp",     75);
  const rr   = warnAndInterp(rr_arr,   "respiratory_rate", 16);
  const spo2 = warnAndInterp(spo2_arr, "spo2",             97);
  const temp = warnAndInterp(temp_arr, "temperature",      36.8);

  const hasAlertCol = col("alert_status") !== -1;
  if (!hasAlertCol) warnings.push("«alert_status» — визначається автоматично з АТС та SpO₂");

  const alertMap: Record<string, PatientRecord["alert_status"]> = {
    alert: "Alert", confused: "Confused", lethargic: "Lethargic", unresponsive: "Unresponsive",
  };
  const hasO2 = col("supplemental_oxygen") !== -1;

  const data: PatientRecord[] = rawRows.map((row, i) => {
    if (isNaN(th[i]) || isNaN(hr[i])) return null as unknown as PatientRecord;
    const alert_status: PatientRecord["alert_status"] = hasAlertCol
      ? (alertMap[(row[col("alert_status")] ?? "").toLowerCase()] ?? deriveAlertStatus(sbp[i], spo2[i], hr[i]))
      : deriveAlertStatus(sbp[i], spo2[i], hr[i]);
    const suppRaw = hasO2 ? (row[col("supplemental_oxygen")] ?? "").toLowerCase() : "";
    const supplemental_oxygen = suppRaw === "true" || suppRaw === "1" || suppRaw === "yes";
    return {
      time_hours: Math.round(th[i] * 1000) / 1000,
      heart_rate: Math.round(Math.max(0, hr[i])),
      systolic_bp: Math.round(sbp[i] * 10) / 10,
      diastolic_bp: Math.round(dbp[i] * 10) / 10,
      respiratory_rate: Math.round(Math.max(0, rr[i])),
      spo2: Math.round(Math.min(100, Math.max(50, spo2[i])) * 10) / 10,
      temperature: Math.round(Math.min(43, Math.max(30, temp[i])) * 10) / 10,
      alert_status,
      supplemental_oxygen,
      age: col("age") !== -1 && row[col("age")] ? Number(row[col("age")]) : 65,
    };
  }).filter(Boolean);

  return { data, warnings };
}

export default function CSVUpload({
  onLoad,
}: {
  onLoad: (data: PatientRecord[], filename: string, warnings: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (file: File) => {
    if (!file.name.endsWith(".csv")) { setError("Файл повинен бути .csv"); return; }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { data, warnings } = parseCSV(e.target!.result as string);
        if (data.length === 0) throw new Error("CSV не містить рядків даних");
        data.sort((a, b) => a.time_hours - b.time_hours);
        onLoad(data, file.name, warnings);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Помилка читання файлу");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  return (
    <div className="mt-4">
      <h2 className="font-semibold text-xs text-slate-400 uppercase tracking-wide mb-2">Завантажити CSV</h2>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors
          ${dragging ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"}`}
      >
        <p className="text-xs text-slate-400">📂 Перетягніть або натисніть</p>
        <p className="text-xs text-slate-300 mt-1">Лише .csv • UTF-8</p>
        <input ref={inputRef} type="file" accept=".csv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }} />
      </div>
      {error && (
        <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
