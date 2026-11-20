"use client";
import Link from "next/link";
import { type ReactNode } from "react";
import { ArrowRight, Home, Leaf, ArrowUpRight } from "lucide-react";
import { dateInZone, dayNames, type DayType, type Macros } from "@/lib/domain";

export function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({
  title,
  kicker,
  icon: Icon,
  link,
  children,
  className = "",
}: {
  title?: string;
  kicker?: string;
  icon?: typeof Home;
  link?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-head">
          <div>
            <p className="section-kicker">{kicker}</p>
            <div className="card-title">
              {Icon && <Icon size={17} />}
              <h2>{title}</h2>
            </div>
          </div>
          {link && (
            <Link className="text-link" href={link.href}>
              {link.label}
              <ArrowUpRight size={13} />
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({
  title,
  detail,
  href,
  action,
}: {
  title: string;
  detail: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="empty">
      <Leaf size={27} />
      <h3>{title}</h3>
      <p>{detail}</p>
      {href && (
        <Link className="button secondary small" href={href}>
          {action ?? "開始設定"}
          <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function NumberField({
  label,
  name,
  value,
  min = 0,
  max = 10000,
  step = "0.1",
  required = true,
}: {
  label: string;
  name: string;
  value?: number | string;
  min?: number;
  max?: number;
  step?: string;
  required?: boolean;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        name={name}
        defaultValue={value}
        min={min}
        max={max}
        step={step}
        required={required}
      />
    </Field>
  );
}

export function DateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  return (
    <input
      className="control"
      aria-label="紀錄日期"
      type="date"
      value={value}
      max={dateInZone()}
      onChange={(e) => {
        if (e.target.value) onChange(e.target.value);
      }}
    />
  );
}

export function TargetTable({ targets }: { targets: Record<DayType, Macros> }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>日型</th>
            <th>蛋白質</th>
            <th>碳水</th>
            <th>脂肪</th>
            <th>參考熱量</th>
          </tr>
        </thead>
        <tbody>
          {(Object.keys(dayNames) as DayType[]).map((day) => (
            <tr key={day}>
              <td>{dayNames[day]}</td>
              <td>{targets[day].p} g</td>
              <td>{targets[day].c} g</td>
              <td>{targets[day].f} g</td>
              <td>{targets[day].kcal} kcal</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
