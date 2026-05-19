import type { SVGProps } from "react";

type Tone = "olive" | "canopy" | "moss" | "sage" | "gold" | "ivory" | "stone" | "earth";

const tone = (t: Tone) => `var(--color-garden-${t})`;

type BaseProps = Pick<SVGProps<SVGSVGElement>, "className" | "style">;

export function OliveLeaf({
  className,
  style,
  fill = "moss",
}: BaseProps & { fill?: Tone }) {
  return (
    <svg
      viewBox="0 0 24 64"
      fill="none"
      className={className}
      style={style}
      aria-hidden
    >
      <path
        d="M12 1 C 19.5 16, 19.5 48, 12 63 C 4.5 48, 4.5 16, 12 1 Z"
        fill={tone(fill)}
      />
      <path
        d="M12 1 C 6 16, 6 48, 12 63"
        stroke="rgb(0 0 0 / 0.22)"
        strokeWidth="0.5"
        fill="none"
      />
      <line
        x1="12"
        y1="6"
        x2="12"
        y2="58"
        stroke="rgb(0 0 0 / 0.18)"
        strokeWidth="0.4"
      />
    </svg>
  );
}

export function OliveSprig({ className, style }: BaseProps) {
  return (
    <svg
      viewBox="0 0 180 100"
      fill="none"
      className={className}
      style={style}
      aria-hidden
    >
      <path
        d="M4 92 C 50 82, 110 56, 176 18"
        stroke={tone("earth")}
        strokeOpacity="0.7"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      {[
        { x: 36, y: 78, r: -28, s: 0.95, t: "moss" as Tone },
        { x: 36, y: 78, r: 152, s: 0.85, t: "sage" as Tone },
        { x: 72, y: 58, r: -38, s: 1.05, t: "moss" as Tone },
        { x: 72, y: 58, r: 142, s: 0.9, t: "moss" as Tone },
        { x: 108, y: 40, r: -46, s: 1.0, t: "sage" as Tone },
        { x: 138, y: 26, r: -52, s: 0.9, t: "moss" as Tone },
        { x: 162, y: 14, r: -58, s: 0.8, t: "sage" as Tone },
      ].map((l, i) => (
        <g
          key={i}
          transform={`translate(${l.x} ${l.y}) rotate(${l.r}) scale(${l.s})`}
        >
          <path
            d="M0 0 C 4 -8, 4 -24, 0 -34 C -4 -24, -4 -8, 0 0 Z"
            fill={tone(l.t)}
          />
          <path
            d="M0 0 C -2.5 -8, -2.5 -20, 0 -32"
            stroke="rgb(0 0 0 / 0.18)"
            strokeWidth="0.5"
            fill="none"
          />
        </g>
      ))}
      <circle cx="58" cy="64" r="2.6" fill={tone("gold")} fillOpacity="0.92" />
      <circle cx="118" cy="34" r="2.4" fill={tone("gold")} fillOpacity="0.88" />
    </svg>
  );
}

export function OliveBranch({ className, style }: BaseProps) {
  return (
    <svg
      viewBox="0 0 320 220"
      fill="none"
      className={className}
      style={style}
      aria-hidden
    >
      <path
        d="M2 218 C 70 198, 142 158, 200 100 C 240 60, 274 30, 318 4"
        stroke="rgb(44 42 33 / 0.55)"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      {[
        { x: 60, y: 196, r: -22, s: 0.95, t: "moss" as Tone },
        { x: 60, y: 196, r: 200, s: 0.85, t: "sage" as Tone },
        { x: 110, y: 168, r: -30, s: 1.0, t: "moss" as Tone },
        { x: 110, y: 168, r: 196, s: 0.9, t: "moss" as Tone },
        { x: 158, y: 134, r: -36, s: 1.05, t: "sage" as Tone },
        { x: 158, y: 134, r: 188, s: 0.9, t: "moss" as Tone },
        { x: 202, y: 96, r: -44, s: 1.0, t: "moss" as Tone },
        { x: 202, y: 96, r: 180, s: 0.9, t: "sage" as Tone },
        { x: 244, y: 58, r: -52, s: 0.92, t: "moss" as Tone },
        { x: 274, y: 32, r: -58, s: 0.8, t: "sage" as Tone },
      ].map((l, i) => (
        <g
          key={i}
          transform={`translate(${l.x} ${l.y}) rotate(${l.r}) scale(${l.s})`}
        >
          <path
            d="M0 0 C 5 -10, 5 -28, 0 -40 C -5 -28, -5 -10, 0 0 Z"
            fill={tone(l.t)}
          />
          <path
            d="M0 0 C -3 -10, -3 -25, 0 -38"
            stroke="rgb(0 0 0 / 0.18)"
            strokeWidth="0.55"
            fill="none"
          />
        </g>
      ))}
      <circle cx="108" cy="170" r="3.2" fill={tone("gold")} fillOpacity="0.92" />
      <circle cx="202" cy="100" r="3.0" fill={tone("gold")} fillOpacity="0.88" />
      <circle cx="156" cy="136" r="2.6" fill={tone("gold")} fillOpacity="0.7" />
    </svg>
  );
}

export function OliveDivider({ className, style }: BaseProps) {
  return (
    <svg
      viewBox="0 0 320 24"
      fill="none"
      className={className}
      style={style}
      aria-hidden
    >
      <line
        x1="0"
        y1="12"
        x2="130"
        y2="12"
        stroke={tone("gold")}
        strokeOpacity="0.45"
        strokeWidth="0.7"
      />
      <line
        x1="190"
        y1="12"
        x2="320"
        y2="12"
        stroke={tone("gold")}
        strokeOpacity="0.45"
        strokeWidth="0.7"
      />
      <g transform="translate(160 12)">
        <g transform="translate(-9 0) rotate(-22)">
          <path
            d="M0 0 C 3 -2, 3 -8, 0 -12 C -3 -8, -3 -2, 0 0 Z"
            fill={tone("moss")}
          />
        </g>
        <g transform="translate(9 0) rotate(22)">
          <path
            d="M0 0 C 3 -2, 3 -8, 0 -12 C -3 -8, -3 -2, 0 0 Z"
            fill={tone("sage")}
          />
        </g>
        <circle cx="0" cy="-4" r="1.8" fill={tone("gold")} />
      </g>
    </svg>
  );
}

export function HorizonHills({ className, style }: BaseProps) {
  return (
    <svg
      viewBox="0 0 1200 160"
      preserveAspectRatio="none"
      fill="none"
      className={className}
      style={style}
      aria-hidden
    >
      <path
        d="M0 90 Q 180 50 360 80 T 720 70 T 1080 60 T 1200 70 L 1200 160 L 0 160 Z"
        fill={tone("canopy")}
        fillOpacity="0.35"
      />
      <path
        d="M0 120 Q 240 90 520 110 T 920 100 T 1200 110 L 1200 160 L 0 160 Z"
        fill={tone("canopy")}
        fillOpacity="0.55"
      />
      <path
        d="M0 140 Q 280 122 600 134 T 1200 130 L 1200 160 L 0 160 Z"
        fill={tone("olive")}
        fillOpacity="0.85"
      />
    </svg>
  );
}
