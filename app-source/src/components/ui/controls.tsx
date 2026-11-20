"use client";
import { useId, type InputHTMLAttributes } from "react";
import { UiButton, UiProgressTrack } from "./design-system";
export function TextInput({
  label,
  id,
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={`jfs-field ${className}`.trim()}>
      <label htmlFor={inputId}>{label}</label>
      <input {...rest} id={inputId} className="jfs-input" />
    </div>
  );
}

export function ProgressTrack({
  value,
  target,
  label,
  className = "",
}: {
  value: number;
  target?: number | null;
  label: string;
  className?: string;
}) {
  return (
    <div className="jfs-progress">
      <UiProgressTrack
        className={className}
        label={label}
        value={value}
        target={target}
      />
    </div>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
  label,
}: {
  options: ReadonlyArray<{ key: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="jfs-segments" role="group" aria-label={label}>
      {options.map((option) => (
        <UiButton
          key={option.key}
          tone="quiet"
          className={value === option.key ? "selected" : ""}
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </UiButton>
      ))}
    </div>
  );
}
