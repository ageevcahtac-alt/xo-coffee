import type { FlavorProfile } from "@/src/types/lot";

const AXES: { key: keyof FlavorProfile; label: string }[] = [
  { key: "acidity", label: "Кислотность" },
  { key: "sweetness", label: "Сладость" },
  { key: "body", label: "Тело" },
  { key: "aroma", label: "Аромат" },
  { key: "finish", label: "Послевкусие" },
];

const SIZE = 300;
const CENTER = SIZE / 2;
const MAX_RADIUS = 80;
const LABEL_RADIUS = 108;
const RINGS = [0.33, 0.66, 1];
const LABEL_BOX_WIDTH = 80;
const LABEL_BOX_HEIGHT = 30;

function pointAt(index: number, radius: number) {
  const angle = (Math.PI * 2 * index) / AXES.length - Math.PI / 2;
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

function ringPoints(scale: number) {
  return AXES.map((_, index) => {
    const { x, y } = pointAt(index, MAX_RADIUS * scale);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export default function FlavorProfileChart({
  profile,
}: {
  profile: FlavorProfile;
}) {
  const dataPoints = AXES.map((axis, index) => {
    const value = Math.max(0, Math.min(10, profile[axis.key]));
    const { x, y } = pointAt(index, (value / 10) * MAX_RADIUS);
    return { x, y, value };
  });

  const dataPolygon = dataPoints
    .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto block h-72 w-72 max-w-full text-charcoal"
      role="img"
      aria-label="Диаграмма вкусового профиля"
    >
      {RINGS.map((scale) => (
        <polygon
          key={scale}
          points={ringPoints(scale)}
          fill="none"
          stroke="currentColor"
          className="text-charcoal/10"
          strokeWidth={1}
        />
      ))}
      {AXES.map((_, index) => {
        const { x, y } = pointAt(index, MAX_RADIUS);
        return (
          <line
            key={index}
            x1={CENTER}
            y1={CENTER}
            x2={x}
            y2={y}
            stroke="currentColor"
            className="text-charcoal/10"
            strokeWidth={1}
          />
        );
      })}
      <polygon
        points={dataPolygon}
        fill="var(--color-gold)"
        fillOpacity={0.28}
        stroke="var(--color-burgundy)"
        strokeWidth={1.5}
      />
      {dataPoints.map((point, index) => (
        <circle
          key={AXES[index].key}
          cx={point.x}
          cy={point.y}
          r={3}
          fill="var(--color-burgundy)"
        />
      ))}
      {AXES.map((axis, index) => {
        const { x, y } = pointAt(index, LABEL_RADIUS);
        return (
          <foreignObject
            key={axis.key}
            x={x - LABEL_BOX_WIDTH / 2}
            y={y - LABEL_BOX_HEIGHT / 2}
            width={LABEL_BOX_WIDTH}
            height={LABEL_BOX_HEIGHT}
            style={{ pointerEvents: "none", overflow: "visible" }}
          >
            <div
              // xmlns is required on foreignObject content per the SVG spec, but
              // isn't part of React's div prop types — passed via spread to keep it.
              {...{ xmlns: "http://www.w3.org/1999/xhtml" }}
              className="flex h-full w-full flex-col items-center justify-center text-center leading-tight"
            >
              <span className="text-[9px] uppercase tracking-[0.04em] text-charcoal/65">
                {axis.label}
              </span>
              <span className="text-[10px] font-semibold text-burgundy">
                {profile[axis.key]}/10
              </span>
            </div>
          </foreignObject>
        );
      })}
    </svg>
  );
}
