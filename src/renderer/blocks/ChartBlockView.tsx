import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { CompiledBlock } from "../../compiler";
import type { ChartBlock, Theme } from "../../deck-spec";

/** Build a palette of accent-derived hues for multi-series / pie slices. */
function hues(theme: Theme, n: number): string[] {
  const base = [theme.palette.accent, theme.palette.text, theme.palette.muted];
  return Array.from({ length: n }, (_, i) => base[i % base.length]);
}

export function ChartBlockView({ cb, theme }: { cb: CompiledBlock; theme: Theme }) {
  const block = cb.block as ChartBlock;

  // Recharts wants row objects: one per category, with a key per series.
  const data = block.categories.map((cat, i) => {
    const row: Record<string, string | number> = { category: cat };
    block.series.forEach((s) => {
      row[s.name] = s.values[i] ?? 0;
    });
    return row;
  });

  const color = hues(theme, block.series.length);
  const axisStyle = { fill: theme.palette.muted, fontSize: 11, fontFamily: theme.fontFamily };

  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.muted} opacity={0.2} />
      <XAxis dataKey="category" tick={axisStyle} stroke={theme.palette.muted} />
      <YAxis tick={axisStyle} stroke={theme.palette.muted} />
      {block.series.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: theme.palette.text }} />}
    </>
  );

  let chart: React.ReactNode;
  switch (block.chartType) {
    case "line":
      chart = (
        <LineChart data={data}>
          {common}
          {block.series.map((s, i) => (
            <Line key={s.name} dataKey={s.name} stroke={color[i]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      );
      break;
    case "area":
      chart = (
        <AreaChart data={data}>
          {common}
          {block.series.map((s, i) => (
            <Area key={s.name} dataKey={s.name} stroke={color[i]} fill={color[i]} fillOpacity={0.3} />
          ))}
        </AreaChart>
      );
      break;
    case "pie":
      chart = (
        <PieChart>
          <Pie data={data} dataKey={block.series[0].name} nameKey="category" outerRadius="80%" label>
            {data.map((_, i) => (
              <Cell key={i} fill={hues(theme, data.length)[i]} />
            ))}
          </Pie>
        </PieChart>
      );
      break;
    case "scatter":
      chart = (
        <ScatterChart>
          {common}
          {block.series.map((s, i) => (
            <Scatter key={s.name} dataKey={s.name} fill={color[i]} />
          ))}
        </ScatterChart>
      );
      break;
    case "bar":
    default:
      chart = (
        <BarChart data={data}>
          {common}
          {block.series.map((s, i) => (
            <Bar key={s.name} dataKey={s.name} fill={color[i]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      );
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {block.title && (
        <div
          style={{
            color: theme.palette.text,
            fontFamily: theme.fontFamily,
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          {block.title}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chart as any}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
