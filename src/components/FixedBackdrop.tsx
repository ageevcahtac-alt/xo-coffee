export default function FixedBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-screen w-full overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, var(--color-backdrop) 0%, var(--color-burgundy) 55%, var(--color-backdrop) 100%)",
      }}
    >
      {/*
        z-index stays negative (not 0) on purpose: this layer must paint
        behind every normal-flow section on the page. A zero/positive
        z-index on a fixed, opaque-gradient div would instead paint it
        OVER all scrolling content, hiding the entire site.
      */}
      <svg
        className="absolute inset-0 h-full w-full"
        style={{
          opacity: 0.32,
          filter:
            "drop-shadow(1px 1.5px 1px rgba(0, 0, 0, 0.85)) drop-shadow(-0.5px -0.5px 0.5px rgba(255, 235, 180, 0.4))",
        }}
      >
        <defs>
          <linearGradient id="gold-foil" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F3E5AB" />
            <stop offset="40%" stopColor="#C5A059" />
            <stop offset="75%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#8A6D3B" />
          </linearGradient>

          <g id="coffee-leaf" fill="none" stroke="url(#gold-foil)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M0,0 C-6,-14 -22,-18 -34,-10 C-22,-2 -6,-2 0,0 C-6,2 -22,2 -34,10 C-22,18 -6,14 0,0 Z" />
            <line x1="-2" y1="0" x2="-32" y2="0" />
            <path d="M-8,-1 C-10,-5 -14,-7 -18,-8" strokeWidth="1.2" />
            <path d="M-8,1 C-10,5 -14,7 -18,8" strokeWidth="1.2" />
            <path d="M-16,-1 C-18,-4 -21,-6 -24,-7" strokeWidth="1.2" />
            <path d="M-16,1 C-18,4 -21,6 -24,7" strokeWidth="1.2" />
          </g>

          <g id="coffee-berry-cluster" fill="none" stroke="url(#gold-foil)" strokeWidth="2" strokeLinecap="round">
            <circle cx="-7" cy="4" r="6" />
            <circle cx="7" cy="4" r="6" />
            <circle cx="0" cy="-7" r="6" />
            <line x1="0" y1="-13" x2="0" y2="-21" />
          </g>

          <g id="coffee-flower" fill="none" stroke="url(#gold-foil)" strokeWidth="1.6">
            <circle cx="0" cy="-10" r="6.2" />
            <circle cx="9.5" cy="-3" r="6.2" />
            <circle cx="5.9" cy="8" r="6.2" />
            <circle cx="-5.9" cy="8" r="6.2" />
            <circle cx="-9.5" cy="-3" r="6.2" />
            <circle cx="0" cy="0" r="3" fill="url(#gold-foil)" stroke="none" />
          </g>

          <g id="coffee-bean" fill="none" stroke="url(#gold-foil)" strokeWidth="1.8" strokeLinecap="round">
            <ellipse cx="0" cy="0" rx="9" ry="14" />
            <path d="M0,-11 C-3,-6 3,-2 0,3 C-3,8 3,10 0,13" />
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
              stroke="url(#gold-foil)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <use href="#coffee-leaf" transform="translate(35,205) rotate(-30) scale(1.15)" />
            <use href="#coffee-leaf" transform="translate(60,160) rotate(150) scale(1.15)" />
            <use href="#coffee-leaf" transform="translate(85,110) rotate(-40)" />
            <use href="#coffee-leaf" transform="translate(105,70) rotate(140)" />
            <use href="#coffee-berry-cluster" transform="translate(48,180) rotate(20) scale(0.85)" />
            <use href="#coffee-berry-cluster" transform="translate(95,95) rotate(-15) scale(0.85)" />
            <use href="#coffee-flower" transform="translate(122,42) scale(0.9)" />
            <use href="#coffee-bean" transform="translate(150,190) rotate(25) scale(0.9)" />
            <use href="#coffee-bean" transform="translate(20,90) rotate(-20) scale(0.8)" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#coffee-branch-pattern)" />
      </svg>
    </div>
  );
}
