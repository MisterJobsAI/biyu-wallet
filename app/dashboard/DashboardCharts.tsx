"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type TrendPoint = { date: string; total: number };
type CategoryItem = { categoryName: string; total: number };

export function DashboardCharts({
  trend30Days,
  categoryBreakdown,
}: {
  trend30Days: TrendPoint[];
  categoryBreakdown: CategoryItem[];
}) {
  const COLORS = [
    "#7C3AED",
    "#A855F7",
    "#6366F1",
    "#EC4899",
    "#F97316",
    "#22C55E",
    "#06B6D4",
    "#EAB308",
  ];

  const trend = (trend30Days ?? []).map((p) => ({
    ...p,
    label: String(p.date).slice(5, 10),
    total: Number(p.total ?? 0),
  }));

  const cats = (categoryBreakdown ?? []).map((c) => ({
    name: c.categoryName,
    value: Number(c.total ?? 0),
  }));

  return (
    <div className="grid gap-6">
      <div className="bg-purple-800/40 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Gasto últimos 30 días</h3>
          <span className="text-xs text-purple-200">COP</span>
        </div>

        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={trend}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="total" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {trend.length === 0 && (
          <div className="text-sm text-purple-200">Aún no hay datos de los últimos 30 días.</div>
        )}
      </div>

      <div className="bg-purple-800/40 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Gasto por categoría</h3>
          <span className="text-xs text-purple-200">Top</span>
        </div>

        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={cats} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                {cats.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {cats.length === 0 && (
          <div className="text-sm text-purple-200">Aún no hay categorías con gasto este mes.</div>
        )}
      </div>
    </div>
  );
}