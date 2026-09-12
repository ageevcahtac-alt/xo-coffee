"use client";

type Option<T extends string> = { value: T; label: string };

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const width = 100 / options.length;

  return (
    <div className="relative flex border border-charcoal/20 bg-cream-dark p-1">
      <div
        aria-hidden
        className="tab-active absolute inset-y-1 rounded-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          width: `calc(${width}% - 4px)`,
          left: `calc(${index * width}% + 2px)`,
        }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`relative z-10 flex min-h-11 flex-1 items-center justify-center px-2 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] transition-colors active:scale-[0.97] ${
            option.value === value ? "text-cream" : "text-charcoal/60"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
