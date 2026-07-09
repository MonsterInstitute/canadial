// A CSS/SVG-only choropleth of Canada. Each province is a simplified polygon,
// shaded by how many distinct spam numbers have been reported there. No client
// JS — it renders on the server and works with styles disabled.

type Region = {
  key: string; // must match provinceForAreaCode() output
  abbr: string;
  path: string;
  label: [number, number];
  small?: boolean;
};

// Simplified, stylised provinces laid out west→east with the territories across
// the top. Not survey-accurate, but recognisably Canada and cheap to render.
const REGIONS: Region[] = [
  {
    key: "Territories",
    abbr: "North",
    // Yukon + Northwest Territories + Nunavut, drawn as one shaded band.
    path:
      "M120,235 L120,120 L210,112 L210,235 Z " +
      "M210,235 L210,112 L360,105 L392,232 L300,235 Z " +
      "M392,232 L360,105 L620,98 L640,150 L600,205 L470,238 Z",
    label: [365, 165],
  },
  {
    key: "British Columbia",
    abbr: "BC",
    path: "M120,235 L210,235 L205,470 L165,510 L120,475 L108,360 Z",
    label: [158, 360],
  },
  {
    key: "Alberta",
    abbr: "AB",
    path: "M210,235 L300,235 L300,470 L205,470 Z",
    label: [253, 360],
  },
  {
    key: "Saskatchewan",
    abbr: "SK",
    path: "M300,235 L392,232 L392,470 L300,470 Z",
    label: [346, 360],
  },
  {
    key: "Manitoba",
    abbr: "MB",
    path: "M392,232 L470,238 L478,320 L495,470 L392,470 Z",
    label: [433, 370],
  },
  {
    key: "Ontario",
    abbr: "ON",
    path:
      "M470,238 L560,240 L565,320 L622,340 L628,395 L612,448 L560,478 L500,470 L482,320 Z",
    label: [548, 400],
  },
  {
    key: "Quebec",
    abbr: "QC",
    path:
      "M560,240 L600,205 L640,150 L720,240 L735,340 L690,410 L628,395 L622,340 L565,320 Z",
    label: [662, 300],
  },
  {
    key: "New Brunswick",
    abbr: "NB",
    path: "M690,415 L730,410 L735,452 L695,458 Z",
    label: [712, 436],
    small: true,
  },
  {
    key: "Nova Scotia / PEI",
    abbr: "NS",
    path: "M735,432 L785,420 L800,458 L748,468 Z",
    label: [770, 449],
    small: true,
  },
  {
    key: "Newfoundland & Labrador",
    abbr: "NL",
    path: "M735,300 L815,285 L828,350 L752,362 Z",
    label: [782, 326],
    small: true,
  },
];

const CANADA_RGB = "213,43,30"; // --canada-red

// Square-root scale so mid-range provinces stay visible next to a busy outlier.
function fillFor(count: number, max: number): string {
  if (count <= 0 || max <= 0) return "#f1f1f3";
  const intensity = Math.sqrt(count / max);
  const opacity = 0.15 + 0.85 * intensity;
  return `rgba(${CANADA_RGB},${opacity.toFixed(3)})`;
}

function textFill(count: number, max: number): string {
  if (count <= 0 || max <= 0) return "#a1a1aa";
  return Math.sqrt(count / max) > 0.55 ? "#ffffff" : "#3f3f46";
}

export default function CanadaHeatmap({
  provinceCounts,
}: {
  provinceCounts: Record<string, number>;
}) {
  const max = Math.max(0, ...Object.values(provinceCounts));

  return (
    <figure className="m-0">
      <svg
        viewBox="0 0 900 560"
        role="img"
        aria-label="Map of Canada shaded by number of reported spam numbers per province"
        className="h-auto w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {REGIONS.map((r) => {
          const count = provinceCounts[r.key] ?? 0;
          return (
            <g key={r.key}>
              <path
                d={r.path}
                fill={fillFor(count, max)}
                stroke="#ffffff"
                strokeWidth={2}
                strokeLinejoin="round"
              >
                <title>{`${r.key}: ${count} reported number${
                  count === 1 ? "" : "s"
                }`}</title>
              </path>
              <text
                x={r.label[0]}
                y={r.label[1]}
                textAnchor="middle"
                fontSize={r.small ? 11 : 15}
                fontWeight={600}
                fill={textFill(count, max)}
                style={{ pointerEvents: "none" }}
              >
                {r.abbr}
              </text>
              {count > 0 && (
                <text
                  x={r.label[0]}
                  y={r.label[1] + (r.small ? 12 : 16)}
                  textAnchor="middle"
                  fontSize={r.small ? 9 : 11}
                  fill={textFill(count, max)}
                  style={{ pointerEvents: "none" }}
                >
                  {count}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="flex overflow-hidden rounded">
            {[0.15, 0.4, 0.65, 0.9].map((o) => (
              <span
                key={o}
                className="h-3 w-4"
                style={{ background: `rgba(${CANADA_RGB},${o})` }}
              />
            ))}
          </span>
          Fewer → more reports
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-3 w-4 rounded"
            style={{ background: "#f1f1f3" }}
          />
          No reports yet
        </span>
      </figcaption>
    </figure>
  );
}
