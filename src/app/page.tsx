"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SCENARIO_GROUPS, PatientRecord } from "@/lib/generators/scenarios";
import CSVUpload from "@/components/CSVUpload";
import CohortAnalysis from "@/components/CohortAnalysis";
import { calculateNEWS2 } from "@/lib/scorers/news2";
import { calculateCART } from "@/lib/scorers/cart";
import { calculateQSOFA } from "@/lib/scorers/qsofa";
import { calculateSOFA, SOFAInputs } from "@/lib/scorers/sofa";
import { calculateWeaning, WeaningInputs } from "@/lib/scorers/weaning";
import { calculateEuroScore, EuroScoreInputs } from "@/lib/scorers/euroscore";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const riskColor = (level: string) => {
  if (level === "Low") return "bg-green-100 text-green-800 border-green-200";
  if (level === "Medium" || level === "Intermediate" || level === "Borderline") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-red-100 text-red-800 border-red-200";
};

function NumInput({ label, unit, value, onChange, min, max, step = 1 }: {
  label: string; unit?: string; value: number | ""; onChange: (v: number | null) => void;
  min?: number; max?: number; step?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-500 font-medium">{label}{unit ? ` (${unit})` : ""}</label>
      <input
        type="number" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
      />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700">
      <div
        onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full transition-colors relative ${value ? "bg-blue-500" : "bg-slate-200"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : ""}`} />
      </div>
      {label}
    </label>
  );
}

function Select<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-500 font-medium">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Monitoring Section
// ─────────────────────────────────────────────────────────────
function MonitoringSection({ data, recordIdx, current }: {
  data: PatientRecord[]; recordIdx: number; current: PatientRecord | null;
}) {
  if (!current) return (
    <div className="bg-white rounded-xl p-12 text-center border border-slate-100">
      <p className="text-4xl mb-3">📊</p>
      <p className="text-slate-500">Оберіть демо-сценарій з бічної панелі</p>
    </div>
  );
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "HR", value: current.heart_rate as number, unit: "bpm", icon: "❤️", alert: (current.heart_rate as number) > 130 || (current.heart_rate as number) < 40 },
          { label: "SpO₂", value: current.spo2 as number, unit: "%", icon: "🫁", alert: (current.spo2 as number) < 94 },
          { label: "SBP", value: current.systolic_bp as number, unit: "mmHg", icon: "📉", alert: (current.systolic_bp as number) < 90 || (current.systolic_bp as number) > 180 },
          { label: "RR", value: current.respiratory_rate as number, unit: "/хв", icon: "🌬️", alert: (current.respiratory_rate as number) > 25 || (current.respiratory_rate as number) < 8 },
          { label: "Темп", value: current.temperature as number, unit: "°C", icon: "🌡️", alert: (current.temperature as number) > 38.5 || (current.temperature as number) < 35.5 },
        ].map((v) => (
          <div key={v.label} className={`bg-white rounded-xl p-4 border-2 shadow-sm ${v.alert ? "border-red-400" : "border-slate-100"}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">{v.icon} {v.label}</span>
              {v.alert && <span className="text-xs text-red-500">⚠️</span>}
            </div>
            <p className={`text-2xl font-bold ${v.alert ? "text-red-600" : "text-slate-800"}`}>
              {v.label === "Темп" ? v.value.toFixed(1) : Math.round(v.value)}
            </p>
            <p className="text-xs text-slate-400">{v.unit}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
        <h3 className="font-semibold mb-4 text-slate-700">Динаміка вітальних показників</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time_hours" tickFormatter={(v: number) => v.toFixed(1) + "г"} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <ReferenceLine x={data[recordIdx]?.time_hours} stroke="#6366f1" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="systolic_bp" stroke="#ef4444" dot={false} name="АТС" strokeWidth={2} />
            <Line type="monotone" dataKey="heart_rate" stroke="#f97316" dot={false} name="ЧСС" strokeWidth={2} />
            <Line type="monotone" dataKey="spo2" stroke="#3b82f6" dot={false} name="SpO₂" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Стан свідомості:</span>
          <Badge className={
            current.alert_status === "Alert" ? "bg-green-100 text-green-800" :
            current.alert_status === "Confused" ? "bg-yellow-100 text-yellow-800" :
            current.alert_status === "Lethargic" ? "bg-orange-100 text-orange-800" :
            "bg-red-100 text-red-800"
          }>{current.alert_status}</Badge>
          <span className="text-sm text-slate-500 ml-4">O₂:</span>
          <Badge className={current.supplemental_oxygen ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"}>
            {current.supplemental_oxygen ? "Додатковий O₂" : "Кімнатне повітря"}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Clinical Scores Section
// ─────────────────────────────────────────────────────────────
function ClinicalScoresPanel({ current }: { current: PatientRecord | null }) {
  const news2 = current ? calculateNEWS2(current) : null;
  const cart = current ? calculateCART(current) : null;
  const qsofa = current ? calculateQSOFA(current) : null;

  if (!current) return (
    <div className="bg-white rounded-xl p-12 text-center border border-slate-100">
      <p className="text-4xl mb-3">🔬</p>
      <p className="text-slate-500">Оберіть демо-сценарій для розрахунку клінічних шкал</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* NEWS2 */}
      <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700">📊 NEWS2 (National Early Warning Score)</h3>
          {news2 && <Badge className={riskColor(news2.risk_level)}>{news2.risk_level}</Badge>}
        </div>
        {news2 && (
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-slate-800">{news2.total}</p>
              <p className="text-xs text-slate-400">/ 20</p>
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-600 mb-3">{news2.recommendation}</p>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {Object.entries(news2.components).map(([k, v]) => (
                  <div key={k} className={`px-2 py-1 rounded text-center ${v > 0 ? "bg-red-50 text-red-700 font-medium" : "bg-green-50 text-green-700"}`}>
                    <div>{k.replace(/_/g, " ")}</div>
                    <div className="font-bold">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* qSOFA + CART */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700">🦠 qSOFA</h3>
            {qsofa && <Badge className={qsofa.sepsis_risk ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
              {qsofa.sepsis_risk ? "Ризик сепсису" : "Низький ризик"}
            </Badge>}
          </div>
          {qsofa && (
            <div className="flex items-center gap-4">
              <p className="text-4xl font-bold text-slate-800">{qsofa.total}<span className="text-lg text-slate-400">/3</span></p>
              <p className="text-sm text-slate-600">{qsofa.recommendation}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700">⚡ CART Score</h3>
            {cart && <Badge className={riskColor(cart.risk_category)}>{cart.risk_category}</Badge>}
          </div>
          {cart && (
            <div>
              <div className="flex items-center gap-4 mb-2">
                <p className="text-4xl font-bold text-slate-800">{cart.total}<span className="text-lg text-slate-400">/20</span></p>
                <p className="text-sm text-slate-600">{cart.percentile.toFixed(0)}-й перцентиль</p>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className={`h-2 rounded-full ${cart.percentile > 75 ? "bg-red-500" : cart.percentile > 50 ? "bg-orange-400" : "bg-green-500"}`}
                  style={{ width: `${cart.percentile}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SOFA Section
// ─────────────────────────────────────────────────────────────
const defaultSOFA: SOFAInputs = {
  pao2_fio2: null, on_mechanical_ventilation: false,
  platelets: null,
  bilirubin_umol: null, bilirubin_mgdl: null, use_umol: true,
  map: null, dopamine: null, dobutamine: false, norepinephrine: null, epinephrine: null,
  gcs: null,
  creatinine_umol: null, creatinine_mgdl: null, urine_output_ml_day: null,
};

function SOFASection() {
  const [inp, setInp] = useState<SOFAInputs>(defaultSOFA);
  const set = (k: keyof SOFAInputs, v: SOFAInputs[keyof SOFAInputs]) =>
    setInp(prev => ({ ...prev, [k]: v }));

  const result = calculateSOFA(inp);
  const sofaRisk = result.total < 6 ? "Low" : result.total < 10 ? "Medium" : "High";

  const componentLabels: Record<string, string> = {
    respiration: "Дихання", coagulation: "Коагуляція", liver: "Печінка",
    cardiovascular: "ССС", cns: "ЦНС", renal: "Нирки",
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700">🫀 SOFA Score (Sequential Organ Failure Assessment)</h3>
          <div className="flex items-center gap-3">
            <Badge className={riskColor(sofaRisk)}>Летальність: {result.mortality_range}</Badge>
            <span className="text-3xl font-bold text-slate-800">{result.total}<span className="text-lg text-slate-400">/24</span></span>
          </div>
        </div>

        {/* Component bar */}
        <div className="grid grid-cols-6 gap-2 mb-6">
          {Object.entries(result.components).map(([k, v]) => (
            <div key={k} className="text-center">
              <div className={`rounded-lg py-3 font-bold text-lg mb-1 ${v >= 3 ? "bg-red-100 text-red-700" : v >= 2 ? "bg-orange-100 text-orange-700" : v >= 1 ? "bg-yellow-100 text-yellow-700" : "bg-green-50 text-green-700"}`}>
                {v}
              </div>
              <p className="text-xs text-slate-500">{componentLabels[k]}</p>
            </div>
          ))}
        </div>

        {/* Unit toggle */}
        <div className="flex items-center gap-4 mb-4">
          <Toggle label="Одиниці: мкмоль/л (для білірубіну та креатиніну)" value={inp.use_umol} onChange={v => set("use_umol", v)} />
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Respiration */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
            <h4 className="font-medium text-slate-700 text-sm">🫁 Дихання</h4>
            <NumInput label="PaO₂/FiO₂" value={inp.pao2_fio2 ?? ""} onChange={v => set("pao2_fio2", v)} min={0} max={600} />
            <Toggle label="ШВЛ" value={inp.on_mechanical_ventilation} onChange={v => set("on_mechanical_ventilation", v)} />
          </div>

          {/* Coagulation */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
            <h4 className="font-medium text-slate-700 text-sm">🩸 Коагуляція</h4>
            <NumInput label="Тромбоцити" unit="×10³/мкл" value={inp.platelets ?? ""} onChange={v => set("platelets", v)} min={0} max={600} />
          </div>

          {/* Liver */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
            <h4 className="font-medium text-slate-700 text-sm">🫀 Печінка</h4>
            {inp.use_umol
              ? <NumInput label="Білірубін" unit="мкмоль/л" value={inp.bilirubin_umol ?? ""} onChange={v => set("bilirubin_umol", v)} min={0} max={1000} />
              : <NumInput label="Білірубін" unit="мг/дл" value={inp.bilirubin_mgdl ?? ""} step={0.1} onChange={v => set("bilirubin_mgdl", v)} min={0} max={60} />
            }
          </div>

          {/* Cardiovascular */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
            <h4 className="font-medium text-slate-700 text-sm">❤️ ССС</h4>
            <NumInput label="MAP" unit="мм рт.ст." value={inp.map ?? ""} onChange={v => set("map", v)} min={0} max={150} />
            <NumInput label="Допамін" unit="мкг/кг/хв" value={inp.dopamine ?? ""} step={0.5} onChange={v => set("dopamine", v)} min={0} max={30} />
            <NumInput label="Норепінефрин" unit="мкг/кг/хв" value={inp.norepinephrine ?? ""} step={0.01} onChange={v => set("norepinephrine", v)} min={0} max={2} />
            <NumInput label="Епінефрин" unit="мкг/кг/хв" value={inp.epinephrine ?? ""} step={0.01} onChange={v => set("epinephrine", v)} min={0} max={2} />
            <Toggle label="Добутамін" value={inp.dobutamine} onChange={v => set("dobutamine", v)} />
          </div>

          {/* CNS */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
            <h4 className="font-medium text-slate-700 text-sm">🧠 ЦНС (ШКГ)</h4>
            <NumInput label="GCS" value={inp.gcs ?? ""} onChange={v => set("gcs", v)} min={3} max={15} />
          </div>

          {/* Renal */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
            <h4 className="font-medium text-slate-700 text-sm">🫘 Нирки</h4>
            {inp.use_umol
              ? <NumInput label="Креатинін" unit="мкмоль/л" value={inp.creatinine_umol ?? ""} onChange={v => set("creatinine_umol", v)} min={0} max={1500} />
              : <NumInput label="Креатинін" unit="мг/дл" step={0.1} value={inp.creatinine_mgdl ?? ""} onChange={v => set("creatinine_mgdl", v)} min={0} max={17} />
            }
            <NumInput label="Діурез" unit="мл/добу" value={inp.urine_output_ml_day ?? ""} onChange={v => set("urine_output_ml_day", v)} min={0} max={5000} />
          </div>
        </div>

        <button onClick={() => setInp(defaultSOFA)} className="mt-4 text-xs text-slate-400 hover:text-slate-600 underline">
          Очистити
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Ventilator Weaning Section
// ─────────────────────────────────────────────────────────────
const defaultWeaning: WeaningInputs = {
  respiratory_rate: null, tidal_volume_ml: null,
  p01: null, spo2: null, fio2: null, peep: null, mip: null,
  gcs: null,
  cough_strength: "weak", secretions: "moderate",
  cause_of_intubation_resolved: false, hemodynamically_stable: false,
  no_vasopressors: false, spontaneous_breathing_trial_passed: false,
  sbt_duration_min: null,
};

function WeaningSection() {
  const [inp, setInp] = useState<WeaningInputs>(defaultWeaning);
  const set = <K extends keyof WeaningInputs>(k: K, v: WeaningInputs[K]) =>
    setInp(prev => ({ ...prev, [k]: v }));

  const result = calculateWeaning(inp);

  const readinessColor = result.readiness === "Ready"
    ? "bg-green-100 text-green-800 border-green-200"
    : result.readiness === "Borderline"
    ? "bg-yellow-100 text-yellow-800 border-yellow-200"
    : "bg-red-100 text-red-800 border-red-200";

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700">🌬️ Відлучення від ШВЛ (Ventilator Weaning)</h3>
          <Badge className={readinessColor}>{result.readiness}</Badge>
        </div>

        {/* Result summary */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: "RSBI", value: result.details.rsbi_label, pass: result.rsbi_pass },
            { label: "P0.1", value: result.details.p01_label, pass: result.p01_pass },
            { label: "Оксигенація", value: result.details.oxygenation_label, pass: result.oxygenation_pass },
            { label: "MIP/NIF", value: result.details.mip_label, pass: result.mip_pass },
            { label: "Клінічна оцінка", value: result.details.clinical_label, pass: result.clinical_score >= 4 },
          ].map(item => (
            <div key={item.label} className={`rounded-xl p-3 text-center border ${item.pass === true ? "bg-green-50 border-green-200" : item.pass === false ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
              <p className="text-xs text-slate-500 mb-1">{item.label}</p>
              <p className="text-xs font-medium text-slate-700">{item.value}</p>
              {item.pass !== null && <p className="text-lg mt-1">{item.pass ? "✓" : "✗"}</p>}
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 text-sm text-blue-800">
          <strong>Рекомендація:</strong> {result.recommendation}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* RSBI */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
            <h4 className="font-medium text-slate-700 text-sm">RSBI (Rapid Shallow Breathing Index)</h4>
            <NumInput label="ЧД спонтанна" unit="/хв" value={inp.respiratory_rate ?? ""} onChange={v => set("respiratory_rate", v)} min={0} max={60} />
            <NumInput label="ДО спонтанний" unit="мл" value={inp.tidal_volume_ml ?? ""} onChange={v => set("tidal_volume_ml", v)} min={0} max={1000} />
            <p className="text-xs text-slate-400">Ціль: RSBI &lt;105 бр/хв/л</p>
          </div>

          {/* Pressure & oxygenation */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
            <h4 className="font-medium text-slate-700 text-sm">Параметри оксигенації</h4>
            <NumInput label="SpO₂" unit="%" value={inp.spo2 ?? ""} onChange={v => set("spo2", v)} min={60} max={100} />
            <NumInput label="FiO₂" unit="0.21–1.0" step={0.01} value={inp.fio2 ?? ""} onChange={v => set("fio2", v)} min={0.21} max={1.0} />
            <NumInput label="PEEP" unit="смH₂O" value={inp.peep ?? ""} onChange={v => set("peep", v)} min={0} max={25} />
            <p className="text-xs text-slate-400">Ціль: SpO₂/FiO₂ ≥150, PEEP ≤8, FiO₂ ≤0.5</p>
          </div>

          {/* Muscle strength */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
            <h4 className="font-medium text-slate-700 text-sm">М&apos;язова сила</h4>
            <NumInput label="P0.1" unit="смH₂O (від&apos;ємне)" step={0.1} value={inp.p01 ?? ""} onChange={v => set("p01", v)} min={-15} max={0} />
            <NumInput label="MIP/NIF" unit="смH₂O (від&apos;ємне)" value={inp.mip ?? ""} onChange={v => set("mip", v)} min={-80} max={0} />
            <p className="text-xs text-slate-400">MIP ≤−20 cmH₂O — достатньо</p>
          </div>

          {/* Clinical checklist */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
            <h4 className="font-medium text-slate-700 text-sm">Клінічна готовність</h4>
            <NumInput label="ШКГ" value={inp.gcs ?? ""} onChange={v => set("gcs", v)} min={3} max={15} />
            <Toggle label="Причина інтубації усунена" value={inp.cause_of_intubation_resolved} onChange={v => set("cause_of_intubation_resolved", v)} />
            <Toggle label="Гемодинамічно стабільний" value={inp.hemodynamically_stable} onChange={v => set("hemodynamically_stable", v)} />
            <Toggle label="Без вазопресорів" value={inp.no_vasopressors} onChange={v => set("no_vasopressors", v)} />
            <Toggle label="SBT пройдено успішно" value={inp.spontaneous_breathing_trial_passed} onChange={v => set("spontaneous_breathing_trial_passed", v)} />
            <Select
              label="Сила кашлю"
              value={inp.cough_strength}
              onChange={v => set("cough_strength", v)}
              options={[{ value: "strong", label: "Сильний" }, { value: "weak", label: "Слабкий" }, { value: "absent", label: "Відсутній" }]}
            />
            <Select
              label="Секреція"
              value={inp.secretions}
              onChange={v => set("secretions", v)}
              options={[{ value: "minimal", label: "Мінімальна" }, { value: "moderate", label: "Помірна" }, { value: "copious", label: "Рясна" }]}
            />
          </div>
        </div>

        <button onClick={() => setInp(defaultWeaning)} className="mt-4 text-xs text-slate-400 hover:text-slate-600 underline">
          Очистити
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EUROScore II Section
// ─────────────────────────────────────────────────────────────
const defaultEuro: EuroScoreInputs = {
  age: 65, female: false,
  creatinine_umol: null, creatinine_mgdl: null, use_umol: true,
  extra_cardiac_arteriopathy: false, poor_mobility: false,
  previous_cardiac_surgery: 0, chronic_lung_disease: false,
  active_endocarditis: false, critical_preoperative: false,
  lvef: "good", recent_mi: false,
  pulmonary_hypertension: "none",
  urgency: "elective",
  weight_of_procedure: "isolated_cabg",
  surgery_on_thoracic_aorta: false,
};

function EuroScoreSection() {
  const [inp, setInp] = useState<EuroScoreInputs>(defaultEuro);
  const set = <K extends keyof EuroScoreInputs>(k: K, v: EuroScoreInputs[K]) =>
    setInp(prev => ({ ...prev, [k]: v }));

  const result = calculateEuroScore(inp);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700">🏥 EUROScore II — Передопераційний ризик</h3>
          <div className="flex items-center gap-3">
            <Badge className={riskColor(result.risk_category)}>{result.risk_category}</Badge>
            <span className="text-2xl font-bold text-slate-800">{result.logistic_mortality.toFixed(1)}%</span>
          </div>
        </div>

        <div className={`rounded-xl p-4 mb-6 border ${result.risk_category === "Low" ? "bg-green-50 border-green-200" : result.risk_category === "Intermediate" ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200"}`}>
          <p className="text-sm font-medium">Прогнозована операційна летальність: <strong>{result.logistic_mortality.toFixed(2)}%</strong></p>
          <p className="text-xs text-slate-500 mt-1">Логістична регресія EuroSCORE II (Nashef et al., 2012)</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
            <h4 className="font-medium text-slate-700 text-sm">Пацієнт</h4>
            <NumInput label="Вік" value={inp.age} onChange={v => set("age", v ?? 65)} min={18} max={100} />
            <Toggle label="Жіноча стать" value={inp.female} onChange={v => set("female", v)} />
            <Toggle label="Одиниці: мкмоль/л" value={inp.use_umol} onChange={v => set("use_umol", v)} />
            {inp.use_umol
              ? <NumInput label="Креатинін" unit="мкмоль/л" value={inp.creatinine_umol ?? ""} onChange={v => set("creatinine_umol", v)} min={0} max={1500} />
              : <NumInput label="Креатинін" unit="мг/дл" step={0.1} value={inp.creatinine_mgdl ?? ""} onChange={v => set("creatinine_mgdl", v)} min={0} max={17} />
            }
            <Toggle label="Екстракардіальна артеріопатія" value={inp.extra_cardiac_arteriopathy} onChange={v => set("extra_cardiac_arteriopathy", v)} />
            <Toggle label="Погана мобільність" value={inp.poor_mobility} onChange={v => set("poor_mobility", v)} />
            <Toggle label="Хронічне захворювання легень" value={inp.chronic_lung_disease} onChange={v => set("chronic_lung_disease", v)} />
            <Toggle label="Активний ендокардит" value={inp.active_endocarditis} onChange={v => set("active_endocarditis", v)} />
            <Toggle label="Критичний стан" value={inp.critical_preoperative} onChange={v => set("critical_preoperative", v)} />
          </div>

          <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
            <h4 className="font-medium text-slate-700 text-sm">Серце та операція</h4>
            <Select label="ФВ ЛШ" value={inp.lvef} onChange={v => set("lvef", v)}
              options={[
                { value: "good", label: ">50% — нормальна" },
                { value: "moderate", label: "31–50% — помірно знижена" },
                { value: "poor", label: "21–30% — значно знижена" },
                { value: "very_poor", label: "≤20% — критично" },
              ]} />
            <Toggle label="Нещодавній ІМ (≤90 днів)" value={inp.recent_mi} onChange={v => set("recent_mi", v)} />
            <Select label="Легенева гіпертензія" value={inp.pulmonary_hypertension} onChange={v => set("pulmonary_hypertension", v)}
              options={[
                { value: "none", label: "Немає (<31 мм рт.ст.)" },
                { value: "moderate", label: "Помірна (31–55)" },
                { value: "severe", label: "Важка (>55)" },
              ]} />
            <Select label="Попередні операції" value={String(inp.previous_cardiac_surgery) as "0" | "1" | "2"}
              onChange={v => set("previous_cardiac_surgery", Number(v))}
              options={[{ value: "0", label: "Немає" }, { value: "1", label: "1 операція" }, { value: "2", label: "2 і більше" }]} />
            <Select label="Терміновість" value={inp.urgency} onChange={v => set("urgency", v)}
              options={[
                { value: "elective", label: "Планова" },
                { value: "urgent", label: "Термінова" },
                { value: "emergency", label: "Екстрена" },
                { value: "salvage", label: "Рятівна" },
              ]} />
            <Select label="Тип операції" value={inp.weight_of_procedure} onChange={v => set("weight_of_procedure", v)}
              options={[
                { value: "isolated_cabg", label: "Ізольоване АКШ" },
                { value: "single_non_cabg", label: "Одна не-АКШ процедура" },
                { value: "two_procedures", label: "2 процедури" },
                { value: "three_or_more", label: "3 і більше" },
              ]} />
            <Toggle label="Операція на аорті" value={inp.surgery_on_thoracic_aorta} onChange={v => set("surgery_on_thoracic_aorta", v)} />
          </div>
        </div>

        <button onClick={() => setInp(defaultEuro)} className="mt-4 text-xs text-slate-400 hover:text-slate-600 underline">
          Очистити
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AHF Profiles Section
// ─────────────────────────────────────────────────────────────
function AHFSection() {
  const [sbp, setSbp] = useState<number | "">(120);
  const [ci, setCi] = useState<number | "">(2.2);
  const [pcwp, setPcwp] = useState<number | "">(15);
  const [lactate, setLactate] = useState<number | "">(1.5);

  const ciNum = Number(ci);
  const pcwpNum = Number(pcwp);
  const sbpNum = Number(sbp);
  const lactateNum = Number(lactate);

  const warm_cold = ciNum >= 2.2 ? "Warm" : "Cold";
  const dry_wet = pcwpNum > 18 ? "Wet" : "Dry";
  const profile = `${warm_cold}-${dry_wet}`;
  const shock = sbpNum < 90 && ciNum < 1.8;

  const cellStyle = (p: string) => {
    const isActive = profile === p;
    if (!isActive) return "bg-slate-50 text-slate-400 border-slate-200";
    if (p === "Warm-Dry") return "bg-green-100 text-green-800 border-green-400 shadow-md scale-105";
    if (p === "Warm-Wet") return "bg-yellow-100 text-yellow-800 border-yellow-400 shadow-md scale-105";
    if (p === "Cold-Dry") return "bg-orange-100 text-orange-800 border-orange-400 shadow-md scale-105";
    return "bg-red-100 text-red-800 border-red-400 shadow-md scale-105";
  };

  const badgeColor =
    profile === "Warm-Dry" ? "bg-green-100 text-green-800" :
    profile === "Warm-Wet" ? "bg-yellow-100 text-yellow-800" :
    profile === "Cold-Dry" ? "bg-orange-100 text-orange-800" :
    "bg-red-100 text-red-800";

  const descColor =
    profile === "Warm-Dry" ? "bg-green-50 border-green-300 text-green-900" :
    profile === "Warm-Wet" ? "bg-yellow-50 border-yellow-300 text-yellow-900" :
    profile === "Cold-Dry" ? "bg-orange-50 border-orange-300 text-orange-900" :
    "bg-red-50 border-red-300 text-red-900";

  const profileDesc: Record<string, { text: string; tx: string }> = {
    "Warm-Dry": {
      text: "Компенсований стан. Нормальна перфузія, нормальний тиск наповнення.",
      tx: "Оптимізуйте пероральну терапію. Контроль АТ та ЧСС.",
    },
    "Warm-Wet": {
      text: "Застій без гіпоперфузії. Підвищений тиск наповнення, збережена перфузія.",
      tx: "Діуретики в/в (фуросемід). При рефрактерності — нітрати в/в.",
    },
    "Cold-Dry": {
      text: "Гіпоперфузія без застою. Знижений серцевий викид, нормальний PCWP.",
      tx: "Обережна інфузійна терапія. Інотропна підтримка (добутамін).",
    },
    "Cold-Wet": {
      text: "Кардіогенний шок. Знижений СВ + підвищений тиск наповнення.",
      tx: "Інотропи + вазопресори. Розглянути ІАБП або VA-ECMO.",
    },
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700">💉 AHF Гемодинамічні профілі (ESC 2021)</h3>
          <div className="flex items-center gap-2">
            {shock && <Badge className="bg-red-100 text-red-800 border-red-200">⚡ ШОК</Badge>}
            <Badge className={badgeColor}>{profile}</Badge>
          </div>
        </div>

        {/* Profile description */}
        <div className={`rounded-xl p-4 mb-5 border ${descColor}`}>
          <p className="font-semibold text-sm mb-1">{profile}</p>
          <p className="text-sm">{profileDesc[profile].text}</p>
          <p className="text-sm mt-2 font-medium">🩺 {profileDesc[profile].tx}</p>
        </div>

        {/* 2×2 Matrix — правильна орієнтація ESC
              Wet (PCWP>18) | Dry (PCWP≤18)
          Warm (CI≥2.2) | Warm-Wet | Warm-Dry
          Cold (CI<2.2)  | Cold-Wet | Cold-Dry
        */}
        <div className="max-w-md mx-auto mb-5">
          <div className="grid grid-cols-3 gap-1 mb-1">
            <div />
            <div className="text-center text-xs text-slate-500 font-medium py-1">💧 Wet<br/>(PCWP &gt;18)</div>
            <div className="text-center text-xs text-slate-500 font-medium py-1">🏜️ Dry<br/>(PCWP ≤18)</div>
          </div>
          <div className="grid grid-cols-3 gap-1 mb-1">
            <div className="flex items-center justify-end pr-2 text-xs text-slate-500 font-medium">🌡️ Warm<br/>(CI ≥2.2)</div>
            <div className={`p-3 text-center text-sm font-semibold border-2 rounded-xl transition-all duration-200 ${cellStyle("Warm-Wet")}`}>Warm-Wet</div>
            <div className={`p-3 text-center text-sm font-semibold border-2 rounded-xl transition-all duration-200 ${cellStyle("Warm-Dry")}`}>Warm-Dry</div>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div className="flex items-center justify-end pr-2 text-xs text-slate-500 font-medium">❄️ Cold<br/>(CI &lt;2.2)</div>
            <div className={`p-3 text-center text-sm font-semibold border-2 rounded-xl transition-all duration-200 ${cellStyle("Cold-Wet")}`}>Cold-Wet</div>
            <div className={`p-3 text-center text-sm font-semibold border-2 rounded-xl transition-all duration-200 ${cellStyle("Cold-Dry")}`}>Cold-Dry</div>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mb-5">Профіль визначається автоматично за введеними значеннями ↑</p>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <NumInput label="АТС" unit="мм рт.ст." value={sbp} onChange={v => setSbp(v ?? "")} min={0} max={250} />
          <NumInput label="СІ (Cardiac Index)" unit="л/хв/м²" step={0.1} value={ci} onChange={v => setCi(v ?? "")} min={0} max={6} />
          <NumInput label="PCWP" unit="мм рт.ст." value={pcwp} onChange={v => setPcwp(v ?? "")} min={0} max={50} />
          <NumInput label="Лактат" unit="ммоль/л" step={0.1} value={lactate} onChange={v => setLactate(v ?? "")} min={0} max={20} />
        </div>

        {/* Threshold indicators */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className={`rounded-lg p-3 text-xs border ${ciNum >= 2.2 ? "bg-green-50 border-green-200 text-green-700" : "bg-orange-50 border-orange-200 text-orange-700"}`}>
            <span className="font-medium">СІ {ciNum >= 2.2 ? "≥" : "<"} 2.2</span> → {ciNum >= 2.2 ? "Warm (тепла перфузія)" : "Cold (гіпоперфузія)"}
          </div>
          <div className={`rounded-lg p-3 text-xs border ${pcwpNum <= 18 ? "bg-green-50 border-green-200 text-green-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
            <span className="font-medium">PCWP {pcwpNum <= 18 ? "≤" : ">"} 18</span> → {pcwpNum <= 18 ? "Dry (нормальний тиск)" : "Wet (застій)"}
          </div>
        </div>

        {lactateNum > 2 && (
          <div className="mt-3 rounded-lg p-3 text-xs border bg-red-50 border-red-200 text-red-700">
            ⚠️ Лактат {lactateNum.toFixed(1)} ммоль/л — підвищений ({lactateNum > 4 ? "важка" : "помірна"} гіперлактатемія). Свідчить про тканинну гіпоперфузію.
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// IABP / VA-ECMO Section
// ─────────────────────────────────────────────────────────────
function IABPSection() {
  const [map, setMap] = useState<number | "">(65);
  const [ci, setCi] = useState<number | "">(2.0);
  const [sbp, setSbp] = useState<number | "">(90);
  const [lactate, setLactate] = useState<number | "">(2.0);
  const [on_dobu, setOnDobu] = useState(false);
  const [on_norepi, setOnNorepi] = useState(false);

  const iabp = Number(map) < 65 || Number(ci) < 2.0 || Number(sbp) < 90;
  const ecmo = (Number(ci) < 1.8 && (on_norepi || Number(lactate) > 4));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-4">⚙️ ІАБП / VA-ECMO — Алгоритм вибору МЦП</h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <NumInput label="MAP" unit="мм рт.ст." value={map} onChange={v => setMap(v ?? "")} min={0} max={150} />
          <NumInput label="СІ" unit="л/хв/м²" step={0.1} value={ci} onChange={v => setCi(v ?? "")} min={0} max={6} />
          <NumInput label="АТС" unit="мм рт.ст." value={sbp} onChange={v => setSbp(v ?? "")} min={0} max={250} />
          <NumInput label="Лактат" unit="ммоль/л" step={0.1} value={lactate} onChange={v => setLactate(v ?? "")} min={0} max={20} />
          <Toggle label="Добутамін" value={on_dobu} onChange={setOnDobu} />
          <Toggle label="Норепінефрин" value={on_norepi} onChange={setOnNorepi} />
        </div>

        <div className="space-y-3">
          <div className={`rounded-xl p-4 border flex items-center justify-between ${iabp ? "bg-yellow-50 border-yellow-300" : "bg-slate-50 border-slate-200"}`}>
            <div>
              <p className="font-medium text-slate-800">ІАБП (Внутрішньоаортальна балонна помпа)</p>
              <p className="text-xs text-slate-500 mt-1">MAP &lt;65 або CI &lt;2.0 або АТС &lt;90 мм рт.ст.</p>
            </div>
            <Badge className={iabp ? "bg-yellow-100 text-yellow-800" : "bg-slate-100 text-slate-600"}>
              {iabp ? "✓ Показана" : "Не показана"}
            </Badge>
          </div>

          <div className={`rounded-xl p-4 border flex items-center justify-between ${ecmo ? "bg-red-50 border-red-300" : "bg-slate-50 border-slate-200"}`}>
            <div>
              <p className="font-medium text-slate-800">VA-ECMO</p>
              <p className="text-xs text-slate-500 mt-1">CI &lt;1.8 + норепінефрин або лактат &gt;4 ммоль/л</p>
            </div>
            <Badge className={ecmo ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"}>
              {ecmo ? "⚡ Показана" : "Не показана"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Reexploration & Transfusion Section
// ─────────────────────────────────────────────────────────────
function ReexplorationSection() {
  // Drainage inputs
  const [drain1, setDrain1] = useState<number | "">(""); // мл за 1-у год
  const [drain2, setDrain2] = useState<number | "">(""); // мл за 2-у год
  const [drain3, setDrain3] = useState<number | "">(""); // мл за 3-ю год
  const [drain4, setDrain4] = useState<number | "">(""); // мл за 4-у год

  // Hemodynamics
  const [sbp, setSbp] = useState<number | "">(110);
  const [map, setMap] = useState<number | "">(70);
  const [cvp, setCvp] = useState<number | "">(8);
  const [hr, setHr] = useState<number | "">(90);
  const [tamponade, setTamponade] = useState(false);

  // Lab
  const [hb, setHb] = useState<number | "">("");          // г/л
  const [hb_pre, setHbPre] = useState<number | "">("");   // г/л доопераційний
  const [platelets, setPlatelets] = useState<number | "">("");
  const [fibrinogen, setFibrinogen] = useState<number | "">("");
  const [inr, setInr] = useState<number | "">("");
  const [weight, setWeight] = useState<number | "">(70);  // кг (для EBL)

  // Coagulopathy
  const [on_heparin, setOnHeparin] = useState(false);
  const [protamine_given, setProtamineGiven] = useState(false);

  // ── Розрахунки ──────────────────────────────────────────────

  const drains = [Number(drain1)||0, Number(drain2)||0, Number(drain3)||0, Number(drain4)||0];
  const total4h = drains.reduce((a,b) => a+b, 0);
  const maxHour = Math.max(...drains);

  // EACTS критерії реоперації (≥1 = показана)
  const criteria: { label: string; met: boolean; detail: string }[] = [
    {
      label: "> 200 мл/год протягом ≥2 годин поспіль",
      met: drains[0] > 200 && drains[1] > 200,
      detail: `${drains[0]} + ${drains[1]} мл`,
    },
    {
      label: "> 300 мл у будь-яку одну годину",
      met: maxHour > 300,
      detail: `Макс: ${maxHour} мл/год`,
    },
    {
      label: "> 1000 мл за перші 4 год",
      met: total4h > 1000,
      detail: `Всього: ${total4h} мл`,
    },
    {
      label: "Тампонада серця",
      met: tamponade,
      detail: tamponade ? "Клінічно підтверджена" : "Відсутня",
    },
    {
      label: "Раптова зупинка дренажу + нестабільність",
      met: (drains[0] > 150 || drains[1] > 150) && Number(map) < 60,
      detail: `MAP ${map} мм рт.ст.`,
    },
  ];

  const metCount = criteria.filter(c => c.met).length;
  const reop_indicated = metCount >= 1;

  // EBL (Estimated Blood Loss) за формулою Gross
  let ebl: number | null = null;
  if (Number(hb) > 0 && Number(hb_pre) > 0 && Number(weight) > 0) {
    const ebv = Number(weight) * 70; // мл (середній ОЦК)
    ebl = ebv * ((Number(hb_pre) - Number(hb)) / ((Number(hb_pre) + Number(hb)) / 2));
  }

  // Transfusion triggers (EACTS/ESC 2017)
  const hbNum = Number(hb);
  const plNum = Number(platelets);
  const fibNum = Number(fibrinogen);
  const inrNum = Number(inr);

  const tx: { component: string; trigger: string; dose: string; indicated: boolean; urgency: "routine" | "urgent" | "critical" }[] = [
    {
      component: "🩸 Еритроцитарна маса",
      trigger: "Hb < 70 г/л (або < 80 у пацієнтів з ІХС)",
      dose: "1 доза ≈ підвищує Hb на 10 г/л",
      indicated: hbNum > 0 && hbNum < 80,
      urgency: hbNum > 0 && hbNum < 60 ? "critical" : "urgent",
    },
    {
      component: "🟡 Тромбоцитарна маса",
      trigger: "Тромбоцити < 100 × 10³/мкл (при кровотечі)",
      dose: "1 терапевтична доза (1 аферезна або 5–6 донорських)",
      indicated: plNum > 0 && plNum < 100,
      urgency: plNum > 0 && plNum < 50 ? "critical" : "urgent",
    },
    {
      component: "🔶 Свіжозаморожена плазма (FFP)",
      trigger: "INR > 1.5 або ПЧ > 1.5 × норма",
      dose: "10–15 мл/кг",
      indicated: inrNum > 1.5,
      urgency: inrNum > 2.0 ? "critical" : "urgent",
    },
    {
      component: "🟠 Фібриноген / Кріопреципітат",
      trigger: "Фібриноген < 1.5 г/л",
      dose: "Фібриноген 2–4 г в/в або кріо 1 доза/10 кг",
      indicated: fibNum > 0 && fibNum < 1.5,
      urgency: fibNum > 0 && fibNum < 1.0 ? "critical" : "urgent",
    },
    {
      component: "💊 Транексамова кислота",
      trigger: "Хірургічна або фібринолітична кровотеча",
      dose: "1 г в/в болюс, потім 1 г за 8 год",
      indicated: reop_indicated && !on_heparin,
      urgency: "urgent",
    },
    {
      component: "💉 Протамін",
      trigger: "Залишкова гепаринізація після ШК",
      dose: "1 мг на 100 ОД гепарину",
      indicated: on_heparin && !protamine_given,
      urgency: "urgent",
    },
  ];

  const urgencyStyle = (u: string, indicated: boolean) => {
    if (!indicated) return "bg-slate-50 border-slate-200";
    if (u === "critical") return "bg-red-50 border-red-300";
    return "bg-yellow-50 border-yellow-300";
  };

  return (
    <div className="space-y-4">
      {/* Reexploration */}
      <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700">🔪 Показання до реоперації (EACTS)</h3>
          <Badge className={reop_indicated ? "bg-red-100 text-red-800 border-red-300" : "bg-green-100 text-green-800 border-green-300"}>
            {reop_indicated ? `⚡ ПОКАЗАНА (${metCount} критерії)` : "✓ Не показана"}
          </Badge>
        </div>

        {reop_indicated && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 mb-4 text-sm text-red-800">
            <strong>⚠️ Увага:</strong> Виконані критерії реоперації. Оцініть клінічну картину та прийміть рішення невідкладно.
          </div>
        )}

        {/* Drainage inputs */}
        <div className="mb-5">
          <h4 className="text-sm font-medium text-slate-600 mb-3">Об&apos;єм дренажного відділення (мл/год)</h4>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "1-а год", value: drain1, set: setDrain1 },
              { label: "2-а год", value: drain2, set: setDrain2 },
              { label: "3-я год", value: drain3, set: setDrain3 },
              { label: "4-а год", value: drain4, set: setDrain4 },
            ].map(({ label, value, set }) => (
              <div key={label} className="flex flex-col gap-1">
                <label className="text-xs text-slate-500 font-medium">{label}</label>
                <input type="number" min={0} max={3000} value={value}
                  onChange={e => set(e.target.value === "" ? "" : Number(e.target.value))}
                  className={`border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-center font-bold
                    ${Number(value) > 300 ? "border-red-400 bg-red-50 text-red-700" :
                      Number(value) > 200 ? "border-orange-400 bg-orange-50 text-orange-700" :
                      "border-slate-200 bg-white"}`} />
                {Number(value) > 0 && (
                  <p className={`text-xs text-center font-medium ${Number(value) > 300 ? "text-red-600" : Number(value) > 200 ? "text-orange-600" : "text-green-600"}`}>
                    {Number(value) > 300 ? "🔴 КРИТИЧНО" : Number(value) > 200 ? "🟠 Висока" : "🟢 Норма"}
                  </p>
                )}
              </div>
            ))}
          </div>
          {total4h > 0 && (
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="text-slate-500">Всього за 4 год:</span>
              <span className={`font-bold ${total4h > 1000 ? "text-red-600" : total4h > 600 ? "text-orange-600" : "text-green-600"}`}>
                {total4h} мл
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500">Макс/год:</span>
              <span className={`font-bold ${maxHour > 300 ? "text-red-600" : maxHour > 200 ? "text-orange-600" : "text-green-600"}`}>
                {maxHour} мл
              </span>
            </div>
          )}
        </div>

        {/* Hemodynamics */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <NumInput label="АТС" unit="мм рт.ст." value={sbp} onChange={v => setSbp(v ?? "")} min={0} max={250} />
          <NumInput label="MAP" unit="мм рт.ст." value={map} onChange={v => setMap(v ?? "")} min={0} max={150} />
          <NumInput label="ЦВТ" unit="мм рт.ст." value={cvp} onChange={v => setCvp(v ?? "")} min={0} max={40} />
          <NumInput label="ЧСС" unit="уд/хв" value={hr} onChange={v => setHr(v ?? "")} min={0} max={250} />
          <div className="flex items-end pb-1">
            <Toggle label="Тампонада серця" value={tamponade} onChange={setTamponade} />
          </div>
        </div>

        {/* Criteria list */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-600 mb-2">Критерії реоперації:</h4>
          {criteria.map((c, i) => (
            <div key={i} className={`flex items-center justify-between rounded-lg px-4 py-2.5 border ${c.met ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-100"}`}>
              <div className="flex items-center gap-2">
                <span className={`text-lg ${c.met ? "text-red-500" : "text-slate-300"}`}>{c.met ? "✗" : "✓"}</span>
                <span className={`text-sm ${c.met ? "text-red-700 font-medium" : "text-slate-500"}`}>{c.label}</span>
              </div>
              <span className={`text-xs ${c.met ? "text-red-600 font-medium" : "text-slate-400"}`}>{c.detail}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transfusion */}
      <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-4">🩸 Алгоритм трансфузії (EACTS/ESC 2017)</h3>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <NumInput label="Hb поточний" unit="г/л" value={hb} onChange={v => setHb(v ?? "")} min={0} max={200} />
          <NumInput label="Hb доопераційний" unit="г/л" value={hb_pre} onChange={v => setHbPre(v ?? "")} min={0} max={200} />
          <NumInput label="Вага" unit="кг" value={weight} onChange={v => setWeight(v ?? "")} min={30} max={200} />
          <NumInput label="Тромбоцити" unit="×10³/мкл" value={platelets} onChange={v => setPlatelets(v ?? "")} min={0} max={600} />
          <NumInput label="Фібриноген" unit="г/л" step={0.1} value={fibrinogen} onChange={v => setFibrinogen(v ?? "")} min={0} max={8} />
          <NumInput label="INR" unit="" step={0.1} value={inr} onChange={v => setInr(v ?? "")} min={0} max={10} />
          <div className="flex items-end pb-1">
            <Toggle label="Гепаринізація після ШК" value={on_heparin} onChange={setOnHeparin} />
          </div>
          <div className="flex items-end pb-1">
            <Toggle label="Протамін введено" value={protamine_given} onChange={setProtamineGiven} />
          </div>
        </div>

        {/* EBL */}
        {ebl !== null && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm">
            <span className="text-blue-700 font-medium">Розрахункова крововтрата (EBL):</span>
            <span className={`ml-2 font-bold text-lg ${ebl > 1500 ? "text-red-600" : ebl > 800 ? "text-orange-600" : "text-blue-700"}`}>
              {Math.round(ebl)} мл
            </span>
            <span className="text-blue-500 text-xs ml-2">(формула Gross, ОЦК = {Number(weight)*70} мл)</span>
          </div>
        )}

        {/* Transfusion components */}
        <div className="space-y-2">
          {tx.map((t) => (
            <div key={t.component} className={`rounded-xl p-4 border transition-all ${urgencyStyle(t.urgency, t.indicated)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className={`font-medium text-sm ${t.indicated ? (t.urgency === "critical" ? "text-red-800" : "text-yellow-800") : "text-slate-500"}`}>
                    {t.component}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.trigger}</p>
                  {t.indicated && <p className="text-xs font-medium text-slate-700 mt-1">💊 Доза: {t.dose}</p>}
                </div>
                <Badge className={
                  t.indicated
                    ? t.urgency === "critical" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                    : "bg-slate-100 text-slate-500"
                }>
                  {t.indicated ? (t.urgency === "critical" ? "⚡ Критично" : "✓ Показано") : "Не потрібно"}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => { setHb(""); setHbPre(""); setPlatelets(""); setFibrinogen(""); setInr(""); setOnHeparin(false); setProtamineGiven(false); }}
          className="mt-4 text-xs text-slate-400 hover:text-slate-600 underline">
          Очистити лабораторні дані
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root Component
// ─────────────────────────────────────────────────────────────
type Section = "monitoring" | "cardiac" | "clinical" | "cohort";
type ClinicalTab = "scores" | "sofa" | "weaning";
type CardiacTab = "euroscore" | "ahf" | "iabp" | "reexploration";

export default function VirtualICU() {
  const [accepted, setAccepted] = useState(false);
  const [data, setData] = useState<PatientRecord[]>([]);
  const [recordIdx, setRecordIdx] = useState(0);
  const [section, setSection] = useState<Section>("monitoring");
  const [clinicalTab, setClinicalTab] = useState<ClinicalTab>("scores");
  const [cardiacTab, setCardiacTab] = useState<CardiacTab>("euroscore");

  const [csvFilename, setCsvFilename] = useState<string | null>(null);
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const current = data[recordIdx] ?? null;

  if (!accepted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
          <div className="text-center mb-6">
            <span className="text-5xl">🏥</span>
            <h1 className="text-2xl font-bold mt-3">Virtual ICU Monitor v2</h1>
            <p className="text-slate-500 text-sm mt-1">React Edition</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <h2 className="font-bold text-amber-800 mb-2">⚠️ УВАГА: Тільки для освітніх цілей</h2>
            <p className="text-sm text-amber-700">Дана програма є симулятором для навчання. Дані не можуть бути підставою для встановлення діагнозу або призначення лікування.</p>
          </div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setAccepted(true)}>
            ✅ Я розумію — Продовжити
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏥</span>
          <div>
            <h1 className="font-bold text-lg">Virtual ICU Monitor v2</h1>
            <p className="text-xs text-slate-400">AI-Driven Real-Time Patient Monitoring</p>
          </div>
        </div>
        <Badge className="bg-green-600">React Edition</Badge>
      </header>

      <div className="flex h-[calc(100vh-60px)]">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 p-4 overflow-y-auto flex-shrink-0">
          {SCENARIO_GROUPS.map((group) => (
            <div key={group.group} className="mb-4">
              <h2 className="font-semibold text-xs text-slate-400 uppercase tracking-wide mb-1 px-1">
                {group.group}
              </h2>
              <div className="space-y-0.5">
                {group.scenarios.map((s) => (
                  <button key={s.label}
                    onClick={() => { setData(s.fn()); setRecordIdx(0); setSection("monitoring"); }}
                    className="w-full text-left text-xs px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors text-slate-600">
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {data.length > 0 && (
            <>
              <hr className="my-4" />
              <h2 className="font-semibold text-xs text-slate-500 uppercase tracking-wide mb-3">
                {csvFilename
                  ? <span title={csvFilename}>📂 {csvFilename.length > 22 ? csvFilename.slice(0, 20) + "…" : csvFilename}</span>
                  : `Запис ${recordIdx + 1}/${data.length}`}
              </h2>
              <input type="range" min={0} max={data.length - 1} value={recordIdx}
                onChange={(e) => setRecordIdx(Number(e.target.value))}
                className="w-full accent-blue-600" />
              {current && (
                <div className="mt-3 text-xs text-slate-500 space-y-1">
                  <p>Час: {current.time_hours.toFixed(2)} год</p>
                  <p>ЧСС: {Math.round(current.heart_rate as number)} bpm</p>
                  <p>АТС: {Math.round(current.systolic_bp as number)} мм рт.ст.</p>
                  <p>SpO₂: {(current.spo2 as number).toFixed(1)}%</p>
                </div>
              )}
            </>
          )}
          <CSVUpload onLoad={(d, name, warns) => {
            setData(d); setRecordIdx(0); setCsvFilename(name);
            setCsvWarnings(warns); setSection("monitoring");
          }} />
          {csvWarnings.length > 0 && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-1">
              {csvWarnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-700">⚠️ {w}</p>
              ))}
            </div>
          )}
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Top nav */}
          <div className="flex gap-2 mb-5">
            {([
              { id: "monitoring", label: "📊 Моніторинг" },
              { id: "cardiac", label: "🏥 Кардіохірургія" },
              { id: "clinical", label: "🔬 Клінічні шкали" },
              { id: "cohort", label: "📁 Когорти" },
            ] as { id: Section; label: string }[]).map((s) => (
              <button key={s.id} onClick={() => setSection(s.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${s.id === section ? "bg-blue-600 text-white shadow" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Monitoring */}
          {section === "monitoring" && (
            <MonitoringSection data={data} recordIdx={recordIdx} current={current} />
          )}

          {/* Clinical */}
          {section === "clinical" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {([
                  { id: "scores", label: "NEWS2 / qSOFA / CART" },
                  { id: "sofa", label: "SOFA Score" },
                  { id: "weaning", label: "Відлучення від ШВЛ" },
                ] as { id: ClinicalTab; label: string }[]).map(t => (
                  <button key={t.id} onClick={() => setClinicalTab(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${t.id === clinicalTab ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              {clinicalTab === "scores" && <ClinicalScoresPanel current={current} />}
              {clinicalTab === "sofa" && <SOFASection />}
              {clinicalTab === "weaning" && <WeaningSection />}
            </div>
          )}

          {/* Cardiac */}
          {section === "cardiac" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {([
                  { id: "euroscore", label: "EUROScore II" },
                  { id: "ahf", label: "AHF Профілі" },
                  { id: "iabp", label: "ІАБП / VA-ECMO" },
                  { id: "reexploration", label: "🔪 Реоперація / Трансфузія" },
                ] as { id: CardiacTab; label: string }[]).map(t => (
                  <button key={t.id} onClick={() => setCardiacTab(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${t.id === cardiacTab ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              {cardiacTab === "euroscore" && <EuroScoreSection />}
              {cardiacTab === "ahf" && <AHFSection />}
              {cardiacTab === "iabp" && <IABPSection />}
              {cardiacTab === "reexploration" && <ReexplorationSection />}
            </div>
          )}
          {/* Cohort */}
          {section === "cohort" && <CohortAnalysis />}
        </main>
      </div>
    </div>
  );
}
