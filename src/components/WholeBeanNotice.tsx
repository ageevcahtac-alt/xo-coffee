export default function WholeBeanNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex gap-3 border-l-2 border-gold bg-burgundy/[0.04] ${
        compact ? "px-4 py-3" : "px-5 py-4"
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="mt-0.5 shrink-0 text-gold-dark"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
      <p className="text-xs leading-relaxed text-charcoal/70">
        <span className="font-semibold text-burgundy">
          Почему только в зёрнах?{" "}
        </span>
        Уже через 15–30 минут после помола кофе теряет яркие эфирные масла и
        начинает активно окисляться. Мы поставляем кофе исключительно в
        цельном зерне, чтобы сохранить природный терруар и гарантировать тот
        самый первый глоток.
      </p>
    </div>
  );
}
