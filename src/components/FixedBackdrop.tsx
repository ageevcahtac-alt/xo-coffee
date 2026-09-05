export default function FixedBackdrop() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 h-screen w-full overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, var(--color-backdrop) 0%, var(--color-burgundy) 55%, var(--color-backdrop) 100%)",
      }}
    >
      <svg className="absolute inset-0 h-full w-full opacity-20">
        <defs>
          <g id="coffee-leaf" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M0,0 C-6,-14 -22,-18 -34,-10 C-22,-2 -6,-2 0,0 C-6,2 -22,2 -34,10 C-22,18 -6,14 0,0 Z" />
            <line x1="-2" y1="0" x2="-32" y2="0" />
          </g>
          <g id="coffee-berry-pair" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round">
            <circle cx="-6" cy="0" r="6" />
            <circle cx="6" cy="0" r="6" />
            <line x1="0" y1="-6" x2="0" y2="-15" />
          </g>
          <g id="coffee-flower" fill="none" stroke="var(--color-gold)" strokeWidth="1.6">
            <circle cx="0" cy="-10" r="6.2" />
            <circle cx="9.5" cy="-3" r="6.2" />
            <circle cx="5.9" cy="8" r="6.2" />
            <circle cx="-5.9" cy="8" r="6.2" />
            <circle cx="-9.5" cy="-3" r="6.2" />
            <circle cx="0" cy="0" r="3" fill="var(--color-gold)" stroke="none" />
          </g>

          <pattern
            id="coffee-branch-pattern"
            width="260"
            height="260"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(8)"
          >
            <path
              d="M10,250 C50,210 30,160 70,130 C100,105 90,70 130,30"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <use href="#coffee-leaf" transform="translate(35,205) rotate(-30) scale(1.1)" />
            <use href="#coffee-leaf" transform="translate(60,160) rotate(150) scale(1.1)" />
            <use href="#coffee-leaf" transform="translate(85,110) rotate(-40)" />
            <use href="#coffee-leaf" transform="translate(105,70) rotate(140)" />
            <use href="#coffee-berry-pair" transform="translate(48,180) rotate(20)" />
            <use href="#coffee-berry-pair" transform="translate(95,95) rotate(-15)" />
            <use href="#coffee-flower" transform="translate(122,42) scale(0.9)" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#coffee-branch-pattern)" />
      </svg>
    </div>
  );
}
