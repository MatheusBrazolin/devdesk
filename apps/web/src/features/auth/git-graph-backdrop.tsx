import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'

/**
 * Fundo do lado direito do login: um grafo de git em duas faixas, uma presa
 * no topo e outra no rodapé, com o quadro livre no meio. Branches saem da
 * `main` e voltam com merge, os commits acendem, um ponto lavanda corre pela
 * main e cada merge solta um pulso. Linhas finas e pouca opacidade, sem
 * gradiente. Decorativo (aria-hidden); com movimento reduzido, fica parado.
 */

interface Band {
  place: 'top' | 'bottom'
  /** Altura da main dentro da faixa (viewBox de 800 x 120). */
  y: number
  /** Para onde as branches abrem: -1 sobe, 1 desce (sempre para longe do quadro). */
  dir: -1 | 1
  branches: { from: number; to: number; label: string }[]
  /** Commits soltos na main. */
  commits: number[]
  /** Atraso do desenho, para as faixas não entrarem juntas. */
  delay: number
  /** Duração da volta do ponto lavanda na main. */
  travel: number
}

const BANDS: Band[] = [
  {
    place: 'top',
    y: 88,
    dir: -1,
    branches: [
      { from: 110, to: 380, label: 'feat/retry-webhook' },
      { from: 470, to: 720, label: 'fix/timezone' },
    ],
    commits: [40, 430, 780],
    delay: 0.2,
    travel: 9,
  },
  {
    place: 'bottom',
    y: 32,
    dir: 1,
    branches: [
      { from: 70, to: 300, label: 'feat/cursor-pagination' },
      { from: 390, to: 660, label: 'chore/queue-alert' },
    ],
    commits: [340, 720],
    delay: 0.6,
    travel: 12,
  },
]

const LIFT = 40
const CURVE = 34

/** Branch que sai da main, corre paralela e volta: duas curvas suaves. */
function branchPath(y: number, dir: -1 | 1, from: number, to: number) {
  const top = y + dir * LIFT
  return [
    `M ${from} ${y}`,
    `C ${from + CURVE} ${y}, ${from + CURVE * 0.4} ${top}, ${from + CURVE * 1.6} ${top}`,
    `L ${to - CURVE * 1.6} ${top}`,
    `C ${to - CURVE * 0.4} ${top}, ${to - CURVE} ${y}, ${to} ${y}`,
  ].join(' ')
}

export function GitGraphBackdrop() {
  const reduce = Boolean(useReducedMotion())
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Pontilhado de fundo, como papel quadriculado. */}
      <svg className="absolute inset-0 size-full">
        <defs>
          <pattern id="gg-dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" className="fill-fg" opacity="0.07" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#gg-dots)" />
      </svg>

      {BANDS.map((band) => (
        <svg
          key={band.place}
          viewBox="0 0 800 120"
          preserveAspectRatio="xMidYMid slice"
          className={cn(
            'absolute inset-x-0 h-[120px] w-full',
            band.place === 'top' ? 'top-0' : 'bottom-0',
          )}
        >
          <GraphBand band={band} reduce={reduce} />
        </svg>
      ))}
    </div>
  )
}

function GraphBand({ band, reduce }: { band: Band; reduce: boolean }) {
  const draw = (delay: number, duration = 1.4) =>
    reduce
      ? {}
      : {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { delay, duration, ease: [0.4, 0, 0.2, 1] as const },
        }
  const pop = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { scale: 0, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          transition: { delay, type: 'spring' as const, stiffness: 320, damping: 18 },
        }
  const main = `M -20 ${band.y} L 820 ${band.y}`
  const top = band.y + band.dir * LIFT

  return (
    <g>
      {/* A main: corre de ponta a ponta e o ponto lavanda passa por ela. */}
      <motion.path
        d={main}
        className="stroke-border-strong"
        strokeWidth="1.5"
        fill="none"
        {...draw(band.delay, 1.8)}
      />
      <text
        x="20"
        y={band.y - band.dir * 14}
        className="fill-fg-subtle font-mono"
        fontSize="11"
        opacity="0.7"
      >
        main
      </text>

      {band.branches.map((branch, index) => {
        const start = band.delay + 0.5 + index * 0.35
        const mid = (branch.from + branch.to) / 2
        return (
          <g key={branch.label}>
            <motion.path
              d={branchPath(band.y, band.dir, branch.from, branch.to)}
              className="stroke-fg-subtle"
              strokeWidth="1.5"
              fill="none"
              opacity="0.55"
              {...draw(start)}
            />
            <text
              x={branch.from + CURVE * 1.8}
              y={top + band.dir * 14}
              className="fill-fg-subtle font-mono"
              fontSize="11"
              opacity="0.7"
            >
              {branch.label}
            </text>
            {/* Commits da branch. */}
            {[mid - 50, mid + 20].map((x, commit) => (
              <motion.circle
                key={x}
                cx={x}
                cy={top}
                r="4"
                className="fill-bg stroke-fg-subtle"
                strokeWidth="1.5"
                {...pop(start + 0.9 + commit * 0.15)}
              />
            ))}
            {/* O merge: ponto lavanda e um pulso que se repete. */}
            {!reduce && (
              <circle
                cx={branch.to}
                cy={band.y}
                r="5"
                className="gg-pulse fill-none stroke-accent"
                strokeWidth="1.5"
                style={{ animationDelay: `${start + 1.2 + index * 1.3}s` }}
              />
            )}
            <motion.circle
              cx={branch.to}
              cy={band.y}
              r="5"
              className="fill-accent"
              {...pop(start + 1.3)}
            />
            <motion.circle
              cx={branch.from}
              cy={band.y}
              r="4"
              className="fill-bg stroke-fg-subtle"
              strokeWidth="1.5"
              {...pop(start + 0.1)}
            />
          </g>
        )
      })}

      {band.commits.map((x, index) => (
        <motion.circle
          key={x}
          cx={x}
          cy={band.y}
          r="4"
          className="fill-bg stroke-border-strong"
          strokeWidth="1.5"
          {...pop(band.delay + 1 + index * 0.12)}
        />
      ))}

      {/* O ponto que percorre a main, como um deploy passando. */}
      {!reduce && (
        <circle
          r="3"
          className="gg-travel fill-accent"
          style={{
            offsetPath: `path('${main}')`,
            animationDuration: `${band.travel}s`,
            animationDelay: `${band.delay + 1.8}s`,
          }}
        />
      )}
    </g>
  )
}
