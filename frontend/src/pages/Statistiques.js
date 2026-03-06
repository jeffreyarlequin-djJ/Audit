import { useState, useEffect } from "react";
import { getStatistics } from "@/lib/api";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  LineChart, Line, CartesianGrid
} from "recharts";
import { getScoreColor, getGlobalScoreColor } from "@/components/ScoreRing";

const CRITERIA_LABELS = {
  procedures: "Procedures", priorite: "Priorite", description: "Description",
  acquittement: "Acquittement", sla: "SLA", communication: "Communication",
  diagnostic: "Diagnostic", statut: "Statut", escalade: "Escalade", cloture: "Cloture",
  comprehension: "Comprehension",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-sm border border-slate-700">
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || "#fff" }}>{p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}</p>
      ))}
    </div>
  );
};

export default function Statistiques() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStatistics().then(r => { setData(r.data); setLoading(false); })
      .catch(() => { toast.error("Erreur chargement statistiques"); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="p-8" data-testid="stats-loading">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 w-48"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-slate-100"></div>)}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="p-6 md:p-8" data-testid="stats-empty">
        <h1 className="text-4xl font-bold tracking-tight uppercase text-slate-900 mb-4"
          style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
          Statistiques
        </h1>
        <div className="bg-white border border-slate-200 rounded-sm p-12 text-center">
          <p className="text-slate-500">Aucune donnee disponible. Analysez des tickets pour voir les statistiques.</p>
        </div>
      </div>
    );
  }

  const radarData = Object.entries(data.criteria_averages || {}).map(([k, v]) => ({
    criteria: CRITERIA_LABELS[k] || k,
    score: v,
    fullMark: 10,
  }));

  const barData = Object.entries(data.criteria_averages || {}).map(([k, v]) => ({
    name: CRITERIA_LABELS[k] || k,
    score: v,
    fill: getScoreColor(v),
  }));

  const priorityData = (data.priority_stats || []).map(p => ({
    name: p.priority || "N/A",
    count: p.count,
    score: p.avg_score,
  }));

  return (
    <div className="p-6 md:p-8" data-testid="stats-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight uppercase text-slate-900"
          style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
          Statistiques
        </h1>
        <p className="text-sm text-slate-500 mt-1">{data.total} ticket(s) analyse(s)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        {/* Radar */}
        <div className="md:col-span-6 bg-white border border-slate-200 rounded-sm p-6">
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-4">Profil de Qualite</p>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="criteria" tick={{ fontSize: 10, fill: "#64748b" }} />
              <Radar dataKey="score" stroke="#FF5722" fill="#FF5722" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="md:col-span-6 bg-white border border-slate-200 rounded-sm p-6">
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-4">Scores par Critere</p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={barData} layout="vertical">
              <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: "#64748b" }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="score" radius={[0, 2, 2, 0]} barSize={18}>
                {barData.map((entry, i) => (
                  <Bar key={i} dataKey="score" fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        {/* Monthly Trend */}
        <div className="md:col-span-7 bg-white border border-slate-200 rounded-sm p-6">
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-4">Tendance Mensuelle</p>
          {data.monthly_trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.monthly_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="avg_score" name="Score Moyen" stroke="#FF5722" strokeWidth={2} dot={{ fill: "#FF5722", r: 4 }} />
                <Line type="monotone" dataKey="count" name="Nb Tickets" stroke="#0F172A" strokeWidth={2} dot={{ fill: "#0F172A", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
              Pas assez de donnees pour afficher la tendance
            </div>
          )}
        </div>

        {/* Priority Stats */}
        <div className="md:col-span-5 bg-white border border-slate-200 rounded-sm p-6">
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-4">Par Priorite</p>
          {priorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={priorityData}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Nombre" fill="#0F172A" radius={[2, 2, 0, 0]} barSize={30} />
                <Bar dataKey="score" name="Score Moyen" fill="#FF5722" radius={[2, 2, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
              Pas de donnees par priorite
            </div>
          )}
        </div>
      </div>

      {/* Top and Bottom Tickets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-sm p-6">
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-4">Meilleurs Tickets</p>
          <div className="space-y-2">
            {(data.top_tickets || []).map((t, i) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                  <span className="font-mono text-sm">{t.ticket_ref || "N/A"}</span>
                </div>
                <span className="font-bold text-sm" style={{ color: getGlobalScoreColor(t.score_global) }}>
                  {t.score_global}%
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-sm p-6">
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-4">Tickets a Ameliorer</p>
          <div className="space-y-2">
            {(data.bottom_tickets || []).map((t, i) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                  <span className="font-mono text-sm">{t.ticket_ref || "N/A"}</span>
                </div>
                <span className="font-bold text-sm" style={{ color: getGlobalScoreColor(t.score_global) }}>
                  {t.score_global}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
