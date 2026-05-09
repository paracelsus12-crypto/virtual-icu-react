"use client";
import { useState, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type Row = Record<string, string>;

interface CohortDataset {
  name: string;
  rows: Row[];
  headers: string[];
}

interface FieldMap {
  death?: string;
  age?: string;
  sex?: string;
  icu_days?: string;
  hospital_days?: string;
  vent_hours?: string;
  vent_24h?: string;
  outcome?: string;
  group?: string;       // diagnosis / department / ards_class тощо
  group2?: string;
  ebl?: string;
  urgency?: string;
}

// ─────────────────────────────────────────────────────────────
// CSV Parser
// ─────────────────────────────────────────────────────────────
function parseCohortCSV(text: string): CohortDataset & { error?: string } {
  try {
    const lines = text.trim().split(/\r?\n/);
    const rawH = lines[0].replace(/^\uFEFF/, "");
    const headers = rawH.split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const rows: Row[] = lines.slice(1)
      .filter(l => l.trim())
      .map(line => {
        const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const row: Row = {};
        headers.forEach((h, i) => { row[h] = vals[i] ?? ""; });
        return row;
      });
    return { name: "", rows, headers };
  } catch {
    return { name: "", rows: [], headers: [], error: "Помилка читання файлу" };
  }
}

// ─────────────────────────────────────────────────────────────
// Auto-detect field mapping
// ─────────────────────────────────────────────────────────────
function detectFields(headers: string[]): FieldMap {
  const h = headers.map(x => x.toLowerCase());
  const find = (...candidates: string[]) =>
    headers[candidates.map(c => h.indexOf(c)).find(i => i !== -1) ?? -1] ?? undefined;

  return {
    death:         find("death", "death_inhosp", "летальність", "exitus"),
    age:           find("age", "вік"),
    sex:           find("sex", "стать"),
    icu_days:      find("icu_days", "icu_los_days", "icu_los", "days_icu"),
    hospital_days: find("hospital_days", "hospital_los", "hosp_days"),
    vent_hours:    find("vent_hours", "ventilation_hours", "vent_h"),
    vent_24h:      find("ventilation_24h", "vent_24h", "prolonged_vent"),
    outcome:       find("outcome", "результат", "discharged"),
    group:         find("diagnosis", "dx", "department", "ards_class", "optype", "діагноз"),
    group2:        find("operation", "opname", "approach"),
    ebl:           find("intraop_ebl", "ebl", "blood_loss", "крововтрата"),
    urgency:       find("urgency", "emop", "ургентність"),
  };
}

// ─────────────────────────────────────────────────────────────
// Stats helpers
// ─────────────────────────────────────────────────────────────
function nums(rows: Row[], field?: string): number[] {
  if (!field) return [];
  return rows.map(r => parseFloat(r[field] ?? "")).filter(v => !isNaN(v));
}

function mean(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function median(arr: number[]) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const BOOL_TRUE = new Set(["так", "yes", "1", "true", "1.0", "exitus", "death"]);
function isTruthy(v: string) { return BOOL_TRUE.has((v ?? "").trim().toLowerCase()); }
function isDead(v: string) {
  const l = (v ?? "").trim().toLowerCase();
  return BOOL_TRUE.has(l) || l.includes("exitus") || l.includes("death") || l === "1";
}

const COLORS = ["#3b82f6","#ef4444","#f97316","#10b981","#8b5cf6","#f59e0b","#06b6d4","#ec4899"];

// ─────────────────────────────────────────────────────────────
// Upload zone
// ─────────────────────────────────────────────────────────────
function UploadZone({ onLoad }: { onLoad: (ds: CohortDataset) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handle = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const result = parseCohortCSV(e.target!.result as string);
      if (result.error || result.rows.length === 0) {
        setErr(result.error ?? "Файл порожній або пошкоджений");
        return;
      }
      setErr(null);
      onLoad({ ...result, name: file.name });
    };
    reader.readAsText(file, "utf-8");
  };

  return (
    <div className="max-w-lg mx-auto mt-8">
      <div
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
        onClick={() => ref.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors
          ${drag ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"}`}
      >
        <p className="text-4xl mb-3">📊</p>
        <p className="text-slate-600 font-medium">Перетягніть CSV або натисніть</p>
        <p className="text-slate-400 text-sm mt-1">Підтримуються: ahf_virtual_icu.csv, resp_virtual_icu.csv, cases.csv або будь-який клінічний CSV</p>
        <input ref={ref} type="file" accept=".csv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ""; }} />
      </div>
      {err && <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">⚠️ {err}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "slate" }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    slate: "bg-slate-50 border-slate-100", red: "bg-red-50 border-red-100",
    blue: "bg-blue-50 border-blue-100", green: "bg-green-50 border-green-100",
    orange: "bg-orange-50 border-orange-100", purple: "bg-purple-50 border-purple-100",
  };
  const textColors: Record<string, string> = {
    slate: "text-slate-800", red: "text-red-700", blue: "text-blue-700",
    green: "text-green-700", orange: "text-orange-700", purple: "text-purple-700",
  };
  return (
    <div className={`rounded-xl p-4 border ${colors[color]} shadow-sm`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${textColors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Analysis Panel
// ─────────────────────────────────────────────────────────────
function AnalysisPanel({ ds }: { ds: CohortDataset }) {
  const [tab, setTab] = useState<"overview" | "groups" | "outcomes" | "raw">("overview");
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const fm = detectFields(ds.headers);
  const { rows } = ds;
  const n = rows.length;

  // ── Overview stats ─────────────────────────────────────────
  const deathField = fm.death;
  const outcomeField = fm.outcome;

  let mortality = 0;
  if (deathField) {
    mortality = rows.filter(r => isDead(r[deathField])).length;
  } else if (outcomeField) {
    mortality = rows.filter(r => isDead(r[outcomeField])).length;
  }

  const ageArr = nums(rows, fm.age);
  const icuArr = nums(rows, fm.icu_days);
  const hospArr = nums(rows, fm.hospital_days);
  const ventHArr = nums(rows, fm.vent_hours);
  const eblArr = nums(rows, fm.ebl).filter(v => v > 0);

  let vent24n = 0;
  if (fm.vent_24h) vent24n = rows.filter(r => isTruthy(r[fm.vent_24h!])).length;

  let urgentN = 0;
  if (fm.urgency) urgentN = rows.filter(r => isTruthy(r[fm.urgency!])).length;

  // Sex distribution
  const sexCounts: Record<string, number> = {};
  if (fm.sex) rows.forEach(r => { const s = r[fm.sex!]?.trim(); if (s) sexCounts[s] = (sexCounts[s] ?? 0) + 1; });

  // ── Group stats ────────────────────────────────────────────
  const groupField = fm.group;
  const groupStats: { name: string; n: number; mortality: number; icu: number; vent: number }[] = [];

  if (groupField) {
    const groups: Record<string, Row[]> = {};
    rows.forEach(r => {
      const g = (r[groupField] ?? "Невідомо").trim() || "Невідомо";
      (groups[g] = groups[g] ?? []).push(r);
    });
    Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)
      .forEach(([name, gRows]) => {
        let gDeath = 0;
        if (deathField) gDeath = gRows.filter(r => isDead(r[deathField])).length;
        else if (outcomeField) gDeath = gRows.filter(r => isDead(r[outcomeField])).length;
        const gIcu = nums(gRows, fm.icu_days);
        const gVent = nums(gRows, fm.vent_hours);
        groupStats.push({
          name: name.length > 35 ? name.slice(0, 33) + "…" : name,
          n: gRows.length,
          mortality: gDeath,
          icu: gIcu.length ? mean(gIcu) : 0,
          vent: gVent.length ? mean(gVent) : 0,
        });
      });
  }

  // ── Outcome distribution ───────────────────────────────────
  const outcomeDist: { name: string; value: number }[] = [];
  if (outcomeField) {
    const oc: Record<string, number> = {};
    rows.forEach(r => { const v = (r[outcomeField] ?? "Невідомо").trim() || "Невідомо"; oc[v] = (oc[v] ?? 0) + 1; });
    Object.entries(oc).sort((a, b) => b[1] - a[1]).forEach(([name, value]) => outcomeDist.push({ name, value }));
  } else if (deathField) {
    const alive = rows.filter(r => !isDead(r[deathField])).length;
    const dead = rows.filter(r => isDead(r[deathField])).length;
    if (alive) outcomeDist.push({ name: "Виписка", value: alive });
    if (dead) outcomeDist.push({ name: "Летальний", value: dead });
  }

  // ── Age distribution ───────────────────────────────────────
  const ageBuckets = [
    { name: "<40", min: 0, max: 40 }, { name: "40–49", min: 40, max: 50 },
    { name: "50–59", min: 50, max: 60 }, { name: "60–69", min: 60, max: 70 },
    { name: "70–79", min: 70, max: 80 }, { name: "≥80", min: 80, max: 200 },
  ].map(b => ({ name: b.name, value: ageArr.filter(a => a >= b.min && a < b.max).length }))
    .filter(b => b.value > 0);

  const tabs = [
    { id: "overview", label: "📊 Огляд" },
    { id: "groups", label: "🗂 Групи" },
    { id: "outcomes", label: "📈 Результати" },
    { id: "raw", label: "🔢 Дані" },
  ] as const;

  // ── Export CSV ─────────────────────────────────────────────
  const exportCSV = () => {
    const date = new Date().toISOString().slice(0, 10);
    const rows: string[][] = [];

    // Header
    rows.push(["Virtual ICU — Когортна статистика"]);
    rows.push([`Файл: ${ds.name}`]);
    rows.push([`Дата: ${date}`]);
    rows.push([`Пацієнтів: ${n}`]);
    rows.push([]);

    // Summary
    rows.push(["=== ЗАГАЛЬНА СТАТИСТИКА ==="]);
    rows.push(["Показник", "Значення"]);
    rows.push(["Всього пацієнтів", String(n)]);
    if (mortality > 0) rows.push(["Летальність", `${mortality} (${Math.round(100 * mortality / n)}%)`]);
    if (ageArr.length) rows.push(["Середній вік", `${mean(ageArr).toFixed(1)} р (${Math.min(...ageArr).toFixed(0)}–${Math.max(...ageArr).toFixed(0)})`]);
    if (icuArr.length) rows.push(["ICU дні (сер./медіана)", `${mean(icuArr).toFixed(1)} / ${median(icuArr).toFixed(1)}`]);
    if (hospArr.length) rows.push(["Ліжко-дні (сер.)", mean(hospArr).toFixed(1)]);
    if (ventHArr.length) rows.push(["ШВЛ год (сер./макс)", `${mean(ventHArr).toFixed(1)} / ${Math.max(...ventHArr).toFixed(0)}`]);
    if (vent24n > 0) rows.push(["ШВЛ > 24 год", `${vent24n} (${Math.round(100 * vent24n / n)}%)`]);
    if (urgentN > 0) rows.push(["Ургентні", `${urgentN} (${Math.round(100 * urgentN / n)}%)`]);
    if (eblArr.length) rows.push(["Крововтрата мл (сер./макс)", `${mean(eblArr).toFixed(0)} / ${Math.max(...eblArr).toFixed(0)}`]);
    rows.push([]);

    // Sex
    if (Object.keys(sexCounts).length > 0) {
      rows.push(["=== СТАТЬ ==="]);
      rows.push(["Стать", "n", "%"]);
      Object.entries(sexCounts).forEach(([s, c]) => rows.push([s, String(c), `${Math.round(100 * c / n)}%`]));
      rows.push([]);
    }

    // Groups
    if (groupStats.length > 0) {
      rows.push([`=== ГРУПИ (${fm.group ?? ""}) ===`]);
      const hasIcu = icuArr.length > 0;
      const hasVent = ventHArr.length > 0;
      const header = ["Група", "n", "%"];
      if (mortality > 0) header.push("Летальних", "Летальність %");
      if (hasIcu) header.push("ICU дні (сер.)");
      if (hasVent) header.push("ШВЛ год (сер.)");
      rows.push(header);
      groupStats.forEach(g => {
        const row = [g.name, String(g.n), `${Math.round(100 * g.n / n)}%`];
        if (mortality > 0) row.push(String(g.mortality), g.n > 0 ? `${Math.round(100 * g.mortality / g.n)}%` : "—");
        if (hasIcu) row.push(g.icu > 0 ? g.icu.toFixed(1) : "—");
        if (hasVent) row.push(g.vent > 0 ? g.vent.toFixed(1) : "—");
        rows.push(row);
      });
      rows.push([]);
    }

    // Outcomes
    if (outcomeDist.length > 0) {
      rows.push(["=== РЕЗУЛЬТАТИ ==="]);
      rows.push(["Результат", "n", "%"]);
      outcomeDist.forEach(o => rows.push([o.name, String(o.value), `${Math.round(100 * o.value / n)}%`]));
    }

    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cohort_${ds.name.replace(".csv", "")}_${date}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Export PDF ─────────────────────────────────────────────
  const exportPDF = async () => {
    setExporting(true);
    try {
      // Використовуємо встановлений пакет напряму
      const { jsPDF } = await import("jspdf");

      const margin = 12;
      const pageW = 210;
      const pageH = 297;
      const contentW = pageW - margin * 2;
      const date = new Date().toISOString().slice(0, 10);

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // ── Заголовок ──
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text("Virtual ICU — Когортна статистика", margin, 24);
      pdf.setDrawColor(59, 130, 246);
      pdf.setLineWidth(0.5);
      pdf.line(margin, 27, pageW - margin, 27);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(`Файл: ${ds.name}`, margin, 35);
      pdf.text(`Дата: ${new Date().toLocaleDateString("uk-UA")}`, margin, 41);
      pdf.text(`Пацієнтів: ${n}`, margin, 47);
      pdf.setTextColor(0);

      // ── Загальна статистика ──
      let y = 60;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
      pdf.text("Загальна статистика", margin, y); y += 8;

      const summaryRows: [string, string][] = [
        ["Всього пацієнтів", String(n)],
        ...(mortality > 0 ? [["Летальність", `${mortality} (${Math.round(100 * mortality / n)}%)`] as [string, string]] : []),
        ...(ageArr.length ? [["Середній вік", `${mean(ageArr).toFixed(1)} р (${Math.min(...ageArr).toFixed(0)}–${Math.max(...ageArr).toFixed(0)})`] as [string, string]] : []),
        ...(icuArr.length ? [["ICU дні (сер. / медіана)", `${mean(icuArr).toFixed(1)} / ${median(icuArr).toFixed(1)}`] as [string, string]] : []),
        ...(hospArr.length ? [["Госп. ліжко-дні (сер.)", mean(hospArr).toFixed(1)] as [string, string]] : []),
        ...(ventHArr.length ? [["ШВЛ год (сер. / макс)", `${mean(ventHArr).toFixed(1)} / ${Math.max(...ventHArr).toFixed(0)}`] as [string, string]] : []),
        ...(vent24n > 0 ? [["ШВЛ > 24 год", `${vent24n} (${Math.round(100 * vent24n / n)}%)`] as [string, string]] : []),
        ...(eblArr.length ? [["Крововтрата мл (сер. / макс)", `${mean(eblArr).toFixed(0)} / ${Math.max(...eblArr).toFixed(0)}`] as [string, string]] : []),
        ...(urgentN > 0 ? [["Ургентні", `${urgentN} (${Math.round(100 * urgentN / n)}%)`] as [string, string]] : []),
      ];

      summaryRows.forEach(([label, val], i) => {
        if (y > pageH - 20) { pdf.addPage(); y = 20; }
        if (i % 2 === 0) { pdf.setFillColor(245, 247, 250); pdf.rect(margin, y - 4, contentW, 7, "F"); }
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
        pdf.text(label, margin + 2, y);
        pdf.text(val, pageW - margin - 2, y, { align: "right" });
        y += 7;
      });

      // ── Розподіл результатів ──
      if (outcomeDist.length > 0) {
        y += 8;
        if (y > pageH - 50) { pdf.addPage(); y = 20; }
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
        pdf.text("Розподіл результатів", margin, y); y += 8;
        pdf.setFillColor(226, 232, 240);
        pdf.rect(margin, y - 5, contentW, 8, "F");
        pdf.setFontSize(9);
        pdf.text("Результат", margin + 2, y);
        pdf.text("n", margin + 120, y, { align: "right" });
        pdf.text("%", margin + 175, y, { align: "right" });
        y += 7;
        outcomeDist.forEach((o, i) => {
          if (y > pageH - 15) { pdf.addPage(); y = 20; }
          if (i % 2 === 0) { pdf.setFillColor(248, 250, 252); pdf.rect(margin, y - 4, contentW, 7, "F"); }
          pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
          pdf.text(o.name.length > 50 ? o.name.slice(0, 48) + "…" : o.name, margin + 2, y);
          pdf.text(String(o.value), margin + 120, y, { align: "right" });
          pdf.text(`${Math.round(100 * o.value / n)}%`, margin + 175, y, { align: "right" });
          y += 6;
        });
      }

      // ── Групи ──
      if (groupStats.length > 0) {
        y += 8;
        if (y > pageH - 70) { pdf.addPage(); y = 20; }
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(12);
        pdf.text(`Групи (${fm.group ?? ""})`, margin, y); y += 8;
        pdf.setFillColor(226, 232, 240);
        pdf.rect(margin, y - 5, contentW, 8, "F");
        pdf.setFontSize(9);
        pdf.text("Група", margin + 2, y);
        pdf.text("n", margin + 95, y, { align: "right" });
        pdf.text("%", margin + 115, y, { align: "right" });
        pdf.text("Летальність", margin + 150, y, { align: "right" });
        pdf.text("ICU дні", margin + 175, y, { align: "right" });
        y += 7;
        groupStats.forEach((g, i) => {
          if (y > pageH - 15) { pdf.addPage(); y = 20; }
          if (i % 2 === 0) { pdf.setFillColor(248, 250, 252); pdf.rect(margin, y - 4, contentW, 7, "F"); }
          pdf.setFont("helvetica", "normal"); pdf.setFontSize(9);
          pdf.text(g.name.length > 34 ? g.name.slice(0, 32) + "…" : g.name, margin + 2, y);
          pdf.text(String(g.n), margin + 95, y, { align: "right" });
          pdf.text(`${Math.round(100 * g.n / n)}%`, margin + 115, y, { align: "right" });
          pdf.text(g.mortality > 0 ? `${g.mortality} (${Math.round(100 * g.mortality / g.n)}%)` : "0", margin + 150, y, { align: "right" });
          pdf.text(g.icu > 0 ? `${g.icu.toFixed(1)} д` : "—", margin + 175, y, { align: "right" });
          y += 6;
        });
      }

      // ── Футер ──
      const pageCount = pdf.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        pdf.setPage(p);
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(`Virtual ICU Monitor v2 — Тільки для освітніх цілей`, margin, pageH - 8);
        pdf.text(`${p} / ${pageCount}`, pageW - margin, pageH - 8, { align: "right" });
        pdf.setTextColor(0);
      }

      pdf.save(`cohort_${ds.name.replace(".csv", "")}_${date}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
      alert("Помилка генерації PDF. Перевірте консоль браузера.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">📁 {ds.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{n} пацієнтів · {ds.headers.length} показників</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2 text-xs text-slate-400">
            {fm.death && <span className="bg-slate-100 px-2 py-1 rounded">✓ летальність</span>}
            {fm.age && <span className="bg-slate-100 px-2 py-1 rounded">✓ вік</span>}
            {fm.icu_days && <span className="bg-slate-100 px-2 py-1 rounded">✓ ICU дні</span>}
            {fm.group && <span className="bg-slate-100 px-2 py-1 rounded">✓ групи</span>}
          </div>
          <button onClick={exportCSV}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
            ⬇ CSV
          </button>
          <button onClick={exportPDF} disabled={exporting}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50">
            {exporting ? "⏳ PDF..." : "⬇ PDF"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${t.id === tab ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div ref={reportRef}>
      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="space-y-4">
          {/* Key metrics */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Пацієнтів" value={n} color="blue" />
            <StatCard
              label="Летальність"
              value={mortality > 0 ? `${mortality} (${Math.round(100 * mortality / n)}%)` : "—"}
              sub={mortality > 0 ? `з ${n} пацієнтів` : "дані відсутні"}
              color={mortality > 0 ? "red" : "slate"}
            />
            <StatCard
              label="Середній вік"
              value={ageArr.length ? `${mean(ageArr).toFixed(1)} р` : "—"}
              sub={ageArr.length ? `${Math.min(...ageArr).toFixed(0)}–${Math.max(...ageArr).toFixed(0)} р` : ""}
              color="purple"
            />
            <StatCard
              label="ICU (сер.)"
              value={icuArr.length ? `${mean(icuArr).toFixed(1)} д` : "—"}
              sub={icuArr.length ? `медіана ${median(icuArr).toFixed(1)} д` : ""}
              color="orange"
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            {hospArr.length > 0 && (
              <StatCard label="Госп. ліжко-дні" value={`${mean(hospArr).toFixed(1)} д`} sub={`медіана ${median(hospArr).toFixed(1)}`} />
            )}
            {ventHArr.length > 0 && (
              <StatCard label="Вентиляція (сер.)" value={`${mean(ventHArr).toFixed(1)} г`} sub={`макс ${Math.max(...ventHArr).toFixed(0)} г`} color="blue" />
            )}
            {vent24n > 0 && (
              <StatCard label="ШВЛ > 24 год" value={`${vent24n} (${Math.round(100 * vent24n / n)}%)`} color="orange" />
            )}
            {urgentN > 0 && (
              <StatCard label="Ургентні" value={`${urgentN} (${Math.round(100 * urgentN / n)}%)`} color="red" />
            )}
            {eblArr.length > 0 && (
              <StatCard label="Крововтрата (сер.)" value={`${mean(eblArr).toFixed(0)} мл`} sub={`макс ${Math.max(...eblArr).toFixed(0)} мл`} color="red" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Age distribution */}
            {ageBuckets.length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                <h4 className="font-medium text-sm text-slate-700 mb-3">Розподіл за віком</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={ageBuckets} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Пацієнтів" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Sex distribution */}
            {Object.keys(sexCounts).length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                <h4 className="font-medium text-sm text-slate-700 mb-3">Стать</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={Object.entries(sexCounts).map(([name, value]) => ({ name, value }))}
                      cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {Object.keys(sexCounts).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── GROUPS ── */}
      {tab === "groups" && (
        <div className="space-y-4">
          {groupStats.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-100">
              <p className="text-slate-400">Поле для групування не знайдено в цьому датасеті</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                <h4 className="font-medium text-sm text-slate-700 mb-3">
                  Кількість пацієнтів по групах
                  {groupField && <span className="text-slate-400 font-normal ml-1">({groupField})</span>}
                </h4>
                <ResponsiveContainer width="100%" height={Math.max(200, groupStats.length * 32)}>
                  <BarChart data={groupStats} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={200} />
                    <Tooltip />
                    <Bar dataKey="n" name="Пацієнтів" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                    {(deathField || outcomeField) && (
                      <Bar dataKey="mortality" name="Летальних" fill="#ef4444" radius={[0, 3, 3, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {icuArr.length > 0 && (
                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                  <h4 className="font-medium text-sm text-slate-700 mb-3">Середні ICU дні по групах</h4>
                  <ResponsiveContainer width="100%" height={Math.max(200, groupStats.length * 32)}>
                    <BarChart data={groupStats.filter(g => g.icu > 0)} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={200} />
                      <Tooltip formatter={(v) => typeof v === "number" ? v.toFixed(1) + " д" : v} />
                      <Bar dataKey="icu" name="ICU дні (сер.)" fill="#f97316" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Table */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs text-slate-500 font-medium">Група</th>
                      <th className="text-right px-4 py-2 text-xs text-slate-500 font-medium">n</th>
                      {(deathField || outcomeField) && <th className="text-right px-4 py-2 text-xs text-slate-500 font-medium">Летальність</th>}
                      {icuArr.length > 0 && <th className="text-right px-4 py-2 text-xs text-slate-500 font-medium">ICU (сер.)</th>}
                      {ventHArr.length > 0 && <th className="text-right px-4 py-2 text-xs text-slate-500 font-medium">ШВЛ (сер.)</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {groupStats.map((g, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-700">{g.name}</td>
                        <td className="px-4 py-2 text-right text-slate-600">{g.n}</td>
                        {(deathField || outcomeField) && (
                          <td className={`px-4 py-2 text-right font-medium ${g.mortality > 0 ? "text-red-600" : "text-green-600"}`}>
                            {g.mortality > 0 ? `${g.mortality} (${Math.round(100 * g.mortality / g.n)}%)` : "0"}
                          </td>
                        )}
                        {icuArr.length > 0 && (
                          <td className="px-4 py-2 text-right text-slate-600">
                            {g.icu > 0 ? `${g.icu.toFixed(1)} д` : "—"}
                          </td>
                        )}
                        {ventHArr.length > 0 && (
                          <td className="px-4 py-2 text-right text-slate-600">
                            {g.vent > 0 ? `${g.vent.toFixed(1)} г` : "—"}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── OUTCOMES ── */}
      {tab === "outcomes" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {outcomeDist.length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                <h4 className="font-medium text-sm text-slate-700 mb-3">Розподіл результатів</h4>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={outcomeDist} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={({ name, percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {outcomeDist.map((_, i) => (
                        <Cell key={i} fill={
                          outcomeDist[i].name.toLowerCase().includes("exitus") ||
                          outcomeDist[i].name.toLowerCase().includes("lethal") ||
                          outcomeDist[i].name === "Летальний" ? "#ef4444" : COLORS[i % COLORS.length]
                        } />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend formatter={(v) => v.length > 25 ? v.slice(0, 23) + "…" : v} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ICU LOS distribution */}
            {icuArr.length > 0 && (() => {
              const maxIcu = Math.min(Math.max(...icuArr), 30);
              const step = maxIcu <= 10 ? 2 : 5;
              const buckets: { name: string; value: number }[] = [];
              for (let s = 0; s < maxIcu; s += step) {
                buckets.push({
                  name: `${s}–${s + step}`,
                  value: icuArr.filter(v => v >= s && v < s + step).length,
                });
              }
              buckets.push({ name: `>${maxIcu}`, value: icuArr.filter(v => v >= maxIcu).length });
              return (
                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                  <h4 className="font-medium text-sm text-slate-700 mb-3">ICU LOS (дні)</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={buckets.filter(b => b.value > 0)} margin={{ left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" name="Пацієнтів" fill="#f97316" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}
          </div>

          {/* Ventilation hours */}
          {ventHArr.length > 0 && (() => {
            const maxV = Math.min(Math.max(...ventHArr), 48);
            const vbuckets = [
              { name: "0–2г", value: ventHArr.filter(v => v <= 2).length },
              { name: "2–6г", value: ventHArr.filter(v => v > 2 && v <= 6).length },
              { name: "6–12г", value: ventHArr.filter(v => v > 6 && v <= 12).length },
              { name: "12–24г", value: ventHArr.filter(v => v > 12 && v <= 24).length },
              { name: ">24г", value: ventHArr.filter(v => v > 24).length },
            ].filter(b => b.value > 0);
            return (
              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                <h4 className="font-medium text-sm text-slate-700 mb-1">Тривалість ШВЛ</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Середня {mean(ventHArr).toFixed(1)} год · Медіана {median(ventHArr).toFixed(1)} год · Макс {Math.max(...ventHArr).toFixed(0)} год
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={vbuckets} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Пацієнтів" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}

          {/* EBL */}
          {eblArr.length > 0 && (() => {
            const eblBuckets = [
              { name: "<200", value: eblArr.filter(v => v < 200).length },
              { name: "200–500", value: eblArr.filter(v => v >= 200 && v < 500).length },
              { name: "500–1000", value: eblArr.filter(v => v >= 500 && v < 1000).length },
              { name: "1000–2000", value: eblArr.filter(v => v >= 1000 && v < 2000).length },
              { name: ">2000", value: eblArr.filter(v => v >= 2000).length },
            ].filter(b => b.value > 0);
            return (
              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                <h4 className="font-medium text-sm text-slate-700 mb-1">Інтраопераційна крововтрата (мл)</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Середня {mean(eblArr).toFixed(0)} мл · Медіана {median(eblArr).toFixed(0)} мл · Макс {Math.max(...eblArr).toFixed(0)} мл
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={eblBuckets} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Пацієнтів" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── RAW DATA ── */}
      {tab === "raw" && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-auto max-h-[500px]">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
              <tr>
                {ds.headers.map(h => (
                  <th key={h} className="text-left px-3 py-2 text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((row, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                  {ds.headers.map(h => (
                    <td key={h} className="px-3 py-1.5 text-slate-600 whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis">
                      {row[h] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 100 && (
            <p className="text-center text-xs text-slate-400 py-3">Показано 100 з {rows.length} рядків</p>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root Export
// ─────────────────────────────────────────────────────────────
export default function CohortAnalysis() {
  const [datasets, setDatasets] = useState<CohortDataset[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  const addDataset = (ds: CohortDataset) => {
    setDatasets(prev => {
      const exists = prev.findIndex(d => d.name === ds.name);
      if (exists !== -1) {
        const next = [...prev]; next[exists] = ds; return next;
      }
      return [...prev, ds];
    });
    setActiveIdx(prev => datasets.length);
  };

  return (
    <div>
      {datasets.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {datasets.map((ds, i) => (
            <button key={i} onClick={() => setActiveIdx(i)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors truncate max-w-[200px]
                ${i === activeIdx ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
              📁 {ds.name.length > 20 ? ds.name.slice(0, 18) + "…" : ds.name}
            </button>
          ))}
          <button onClick={() => setDatasets([])}
            className="px-3 py-1.5 rounded-lg text-sm text-slate-400 border border-slate-200 hover:bg-slate-50">
            ✕ Очистити
          </button>
        </div>
      )}

      {datasets.length === 0
        ? <UploadZone onLoad={addDataset} />
        : <AnalysisPanel ds={datasets[activeIdx]} />
      }

      {datasets.length > 0 && (
        <div className="mt-4">
          <UploadZone onLoad={addDataset} />
        </div>
      )}
    </div>
  );
}
