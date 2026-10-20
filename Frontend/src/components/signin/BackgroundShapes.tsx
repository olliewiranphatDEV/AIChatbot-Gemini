type Point = readonly [number, number]

/** Closed Catmull-Rom spline through `points`, expressed as cubic Béziers. */
function smoothClosedPath(points: readonly Point[]): string {
  const n = points.length
  const at = (i: number) => points[(i + n) % n]
  let d = `M${at(0)[0]} ${at(0)[1]}`
  for (let i = 0; i < n; i++) {
    const [x0, y0] = at(i - 1)
    const [x1, y1] = at(i)
    const [x2, y2] = at(i + 1)
    const [x3, y3] = at(i + 2)
    const c1x = x1 + (x2 - x0) / 6
    const c1y = y1 + (y2 - y0) / 6
    const c2x = x2 - (x3 - x1) / 6
    const c2y = y2 - (y3 - y1) / 6
    d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${x2} ${y2}`
  }
  return `${d}Z`
}

// Shapes are traced in a 864 x 1024 box (the left panel at the 1536 x 1024
// reference). Each one is multiplied over the base colour, so overlaps get
// darker the same way the translucent shapes in the reference do. The base is
// drawn inside the SVG because blending cannot reach outside its own group.
const SHAPES: ReadonlyArray<{ fill: string; points: readonly Point[] }> = [
  {
    // Tall leaf at the top right
    fill: '#eff4f0',
    points: [
      [870, 118], [820, 122], [783, 127], [757, 135], [728, 150], [702, 170],
      [684, 190], [660, 235], [637, 285], [625, 330], [622, 370], [617, 420],
      [624, 460], [630, 500], [645, 570], [665, 680], [700, 775], [735, 828],
      [758, 820], [787, 810], [820, 790], [843, 770], [864, 748], [910, 640],
      [920, 400], [905, 200],
    ],
  },
  {
    // Rounded blob behind the card's right edge
    fill: 'url(#bg-shade-b)',
    points: [
      [645, 414], [610, 420], [582, 430], [560, 440], [529, 460], [508, 480],
      [492, 500], [481, 515], [465, 560], [470, 600], [560, 670], [650, 690],
      [735, 665], [771, 640], [807, 625], [822, 615], [836, 605], [864, 590],
      [890, 545], [864, 497], [837, 480], [804, 460], [760, 440], [731, 430],
      [693, 420],
    ],
  },
  {
    // Upper-left blob
    fill: '#eff4f1',
    points: [
      [60, 595], [84, 600], [100, 605], [125, 615], [170, 650], [200, 760],
      [120, 940], [-40, 940], [-60, 700], [-30, 640], [0, 622], [6, 615],
      [19, 605], [29, 600],
    ],
  },
  {
    // Lower-left blobs, largest/lightest first
    fill: 'url(#bg-shade-f)',
    points: [
      [440, 780], [500, 850], [513, 870], [534, 900], [561, 950], [577, 1000],
      [582, 1040], [592, 1100], [640, 1300], [760, 1700], [900, 2400], [-60, 2400], [-60, 700], [150, 640], [330, 660],
    ],
  },
  {
    fill: 'url(#bg-shade-e)',
    points: [
      [330, 740], [410, 840], [410, 862], [408, 870], [396, 900], [363, 950],
      [307, 1000], [273, 1020], [255, 1040], [215, 1100], [150, 1250], [40, 1500], [-60, 1800],
      [-60, 700], [100, 640], [250, 640],
    ],
  },
  {
    fill: 'url(#bg-shade-d)',
    points: [
      [0, 757], [10, 750], [20, 740], [42, 720], [72, 700], [120, 680],
      [170, 672], [260, 720], [310, 820], [308, 870], [302, 900], [283, 950],
      [255, 1000], [242, 1030], [236, 1100], [215, 1250], [140, 1500], [-60, 1800], [-60, 800],
    ],
  },
]

const PATHS = SHAPES.map((shape) => ({ fill: shape.fill, d: smoothClosedPath(shape.points) }))

// Dark Theme: the same shapes, drawn as faint mint veils over the dark base instead of being multiplied.
const DARK_ALPHA = [0.09, 0.14, 0.06, 0.07, 0.06, 0.08]
const DARK_PATHS = SHAPES.map((shape, index) => ({ alpha: DARK_ALPHA[index], d: smoothClosedPath(shape.points) }))

const SVG_CLASS = 'pointer-events-none absolute inset-0 -z-10 size-full desk:right-auto desk:bottom-auto desk:h-[64rem] desk:w-[54rem] desk:overflow-visible'

export default function BackgroundShapes() {
  return (
    <>
    <svg
      className={`${SVG_CLASS} dark:hidden`}
      viewBox="0 0 864 1024"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="bg-soft" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <radialGradient id="bg-shade-b" gradientUnits="userSpaceOnUse" cx="690" cy="440" r="220">
          <stop offset="0" stopColor="#e1e9e2" />
          <stop offset="0.45" stopColor="#e5ede6" />
          <stop offset="0.7" stopColor="#ebf3ed" />
          <stop offset="1" stopColor="#f7f9f7" />
        </radialGradient>
        <linearGradient id="bg-shade-e" gradientUnits="userSpaceOnUse" x1="120" y1="0" x2="300" y2="0">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#f1f5f3" />
        </linearGradient>
        <linearGradient id="bg-shade-f" gradientUnits="userSpaceOnUse" x1="120" y1="0" x2="330" y2="0">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#f6f9f7" />
        </linearGradient>
        <linearGradient id="bg-shade-d" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="260" y2="0">
          <stop offset="0" stopColor="#fbfbfa" />
          <stop offset="0.5" stopColor="#edf2ee" />
          <stop offset="1" stopColor="#f0f4f1" />
        </linearGradient>
      </defs>
      <rect x="-1000" y="-1000" width="3000" height="8000" fill="#ebf3ee" />
      {PATHS.map(({ fill, d }) => (
        <path key={d} d={d} fill={fill} filter="url(#bg-soft)" style={{ mixBlendMode: 'multiply' }} />
      ))}
    </svg>
    <svg className={`${SVG_CLASS} hidden dark:block`} viewBox="0 0 864 1024" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <filter id="bg-soft-dark" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      <rect x="-1000" y="-1000" width="3000" height="8000" fill="var(--color-hero)" />
      {DARK_PATHS.map(({ alpha, d }) => (
        <path key={d} d={d} fill={`rgba(141, 204, 179, ${alpha})`} filter="url(#bg-soft-dark)" />
      ))}
    </svg>
    </>
  )
}
