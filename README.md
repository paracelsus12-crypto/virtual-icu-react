# 🏥 Virtual ICU Monitor v2 — React Edition

> **⚠️ УВАГА: Виключно для освітніх та дослідницьких цілей.**  
> Програма є медичним симулятором. Дані не можуть бути підставою для встановлення діагнозу або призначення лікування.

**Live demo:** [virtual-icu-react.vercel.app](https://virtual-icu-react.vercel.app)

---

## Про проект

Virtual ICU Monitor v2 — це інтерактивна веб-платформа для симуляції та аналізу клінічних даних пацієнтів відділення інтенсивної терапії. Реалізована на Next.js + React як повне переписування оригінальної Python/Streamlit версії.

Призначена для навчання лікарів, студентів медичних спеціальностей та дослідників у галузі інтенсивної терапії та кардіохірургії.

---

## Функціональність

### 📊 Моніторинг
- Реальний час вітальних показників: ЧСС, АТС/АТД, SpO₂, ЧД, температура
- Динамічні графіки трендів (Recharts)
- Індикатори тривоги при відхиленні від норми
- Слайдер перемотки по часовому ряду

### 🦠 25+ клінічних сценаріїв у 5 групах

| Група | Сценарії |
|---|---|
| 🩸 Гемодинаміка | Гіпотензія ×2, гіпертонічний криз, зупинка серця ×2, анафілаксія ×2 |
| 🫁 Дихання | ДН 1 типу (гіпоксемічна), ДН 2 типу (гіперкапнічна), гостра/поступова гіпоксія, набряк легень, ТЕЛА ×2 |
| ❤️ Аритмії | ФП, тріпотіння передсердь, НШТ ×2, ШТ ×2, брадикардія ×3 |
| 🦠 Сепсис | Сепсис-3 (прогресування), Сепсис-3 (відповідь на лікування), септичний шок |
| ⚡ Метаболічні | Гіпоглікемія |

### 🔬 Клінічні шкали
- **NEWS2** — National Early Warning Score 2
- **qSOFA** — quick Sequential Organ Failure Assessment
- **CART** — Cardiff and Vale Deterioration Score
- **SOFA** — Sequential Organ Failure Assessment (6 органів, з одиницями мкмоль/л ↔ мг/дл)
- **Відлучення від ШВЛ** — RSBI, P0.1, MIP/NIF, SpO₂/FiO₂, клінічний чеклист

### 🏥 Кардіохірургія
- **EUROScore II** — логістична регресія передопераційного ризику (Nashef et al., 2012)
- **AHF профілі** — Warm/Cold × Dry/Wet матриця (ESC 2021)
- **ІАБП / VA-ECMO** — алгоритм вибору механічної циркуляторної підтримки
- **Реоперація / Трансфузія** — критерії реоперації EACTS, алгоритм трансфузії з EBL (формула Gross)

### 📁 Когортна статистика
- Завантаження власних CSV датасетів
- Автоматичне визначення полів (летальність, вік, ICU дні, ШВЛ, крововтрата)
- Аналіз по групах (діагноз, ARDS клас, відділення)
- Гістограми, pie charts, таблиці порівняння

### 📂 Завантаження CSV
- Drag & drop власних почасових даних пацієнтів
- Автоматична інтерполяція пропущених значень
- Автогенерація `alert_status` з вітальних показників
- Обов'язкові поля: лише `time_hours` + `heart_rate`

---

## Технічний стек

| Технологія | Версія | Призначення |
|---|---|---|
| Next.js | 16 | Framework (App Router) |
| React | 19 | UI |
| TypeScript | 5 | Типізація |
| Tailwind CSS | 4 | Стилізація |
| Recharts | latest | Графіки |
| shadcn/ui | latest | UI компоненти |

---

## Локальний запуск

```bash
git clone https://github.com/paracelsus12-crypto/virtual-icu-react.git
cd virtual-icu-react
npm install
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000)

---

## Формат CSV для завантаження

```csv
time_hours,heart_rate,systolic_bp,diastolic_bp,respiratory_rate,spo2,temperature,alert_status
0.0,78,122.0,74.0,16,98.0,36.6,Alert
0.083,91,110.0,67.0,20,96.0,37.1,Confused
```

**Обов'язкові:** `time_hours`, `heart_rate`  
**Опціональні** (інтерполюються якщо відсутні): `systolic_bp`, `diastolic_bp`, `respiratory_rate`, `spo2`, `temperature`, `alert_status`, `supplemental_oxygen`, `age`

Детальніше: десятковий роздільник — крапка, кодування — UTF-8.

---

## Структура проекту

```
src/
├── app/
│   ├── layout.tsx
│   └── page.tsx              # Головний компонент (моніторинг, кардіо, клінічні шкали)
├── components/
│   ├── ui/                   # shadcn/ui базові компоненти
│   ├── CSVUpload.tsx         # Завантаження та парсинг CSV
│   └── CohortAnalysis.tsx    # Модуль когортної статистики
├── lib/
│   ├── generators/
│   │   └── scenarios.ts      # 25+ клінічних сценаріїв
│   └── scorers/
│       ├── news2.ts           # NEWS2
│       ├── qsofa.ts           # qSOFA
│       ├── cart.ts            # CART
│       ├── sofa.ts            # SOFA
│       ├── weaning.ts         # Відлучення від ШВЛ
│       └── euroscore.ts       # EUROScore II
└── types/
    └── index.ts              # TypeScript типи
```

---

## Клінічні джерела

- **NEWS2**: Royal College of Physicians (2017)
- **qSOFA**: Singer et al., JAMA (2016) — Sepsis-3
- **SOFA**: Vincent et al., Intensive Care Med (1996)
- **CART**: Churpek et al., Chest (2012)
- **EUROScore II**: Nashef et al., Eur J Cardiothorac Surg (2012)
- **AHF профілі**: ESC Guidelines for Acute Heart Failure (2021)
- **Трансфузія**: EACTS/ESC Guidelines on Perioperative Bleeding (2017)
- **Відлучення від ШВЛ**: Boles et al., Eur Respir J (2007)

---

## Ліцензія

MIT — вільне використання для освітніх та дослідницьких цілей.

---

> Розроблено як навчальний інструмент для підготовки лікарів інтенсивної терапії та кардіохірургії.  
> Не є медичним пристроєм. Не використовувати для прийняття клінічних рішень.
