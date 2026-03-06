import { useState, useEffect } from "react";
import { getDashboard } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ScoreRing, { getScoreLabel, getScoreColor } from "@/components/ScoreRing";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, PieChart, Pie, Cell } from "recharts";
import { Activity, TrendingUp, Shield, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CRITERIA_LABELS = {
  procedures: "Procedures",
  priorite: "Priorite",
  description: "Description",
  acquittement: "Acquittement",
  sla: "SLA",
  communication: "Communication",
  diagnostic: "Diagnostic",
  statut: "Statut",
  escalade: "Escalade",
  cloture: "Cloture",
};

const CHART_COLORS = ["#0F172A", "#FF5722", "#94A3B8", "#CBD5E1"];

function KpiCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="kpi-card animate-fade-in-up" data-testid={`kpi-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">{label}</p>
          <p className={`text-3xl font-bold tracking-tight ${accent ? "text-orange-600" : "text-slate-900"}`}
            style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
            {value}
          </p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className="p-2 bg-slate-100">
          <Icon size={20} strokeWidth={1.5} className="text-slate-600" />
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-sm border border-slate-700">
      <p className="font-bold">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboard().then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8" data-testid="dashboard-loading">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 w-64"></div>
          <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-100"></div>)}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8" data-testid="dashboard-empty">
        <h1 className="text-4xl font-bold tracking-tight uppercase text-slate-900 mb-4"
          style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
          Tableau de Bord
        </h1>
        <div className="bg-white border border-slate-200 rounded-sm p-12 text-center">
          <Activity size={48} strokeWidth={1} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 mb-4">Aucune analyse effectuee pour le moment.</p>
          <button
            data-testid="start-analysis-btn"
            onClick={() => navigate("/analyse")}
            className="bg-slate-900 text-white hover:bg-orange-600 rounded-sm uppercase tracking-wider text-xs font-bold px-6 py-3 transition-colors duration-200"
          >
            Analyser un Ticket
          </button>
        </div>
      </div>
    );
  }

  const radarData = Object.entries(data.criteria_averages || {}).map(([k, v]) => ({
    criteria: CRITERIA_LABELS[k] || k,
    score: v,
    fullMark: 10,
  }));

  const pieData = Object.entries(data.score_distribution || {}).map(([k, v]) => ({ name: k, value: v }));

  return (
    <div className="p-6 md:p-8" data-testid="dashboard-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight uppercase text-slate-900"
            style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
            Tableau de Bord
          </h1>
          <p className="text-sm text-slate-500 mt-1">Vue d'ensemble de la qualite des tickets</p>
        </div>
        <button
          data-testid="new-analysis-btn"
          onClick={() => navigate("/analyse")}
          className="bg-slate-900 text-white hover:bg-orange-600 rounded-sm uppercase tracking-wider text-xs font-bold px-6 py-3 transition-colors duration-200"
        >
          Nouvelle Analyse
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <KpiCard icon={Activity} label="Tickets Analyses" value={data.total_tickets} />
        <KpiCard icon={Target} label="Score Moyen" value={`${data.avg_score}/10`} accent />
        <KpiCard icon={Shield} label="Conformite SLA" value={`${data.sla_rate}%`} />
        <KpiCard icon={TrendingUp} label="Excellent" value={data.score_distribution?.excellent || 0} sub="Score >= 8/10" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
        {/* Radar Chart */}
        <div className="md:col-span-7 bg-white border border-slate-200 rounded-sm p-6">
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-4">Scores Moyens par Critere</p>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="criteria" tick={{ fontSize: 11, fill: "#64748b" }} />
                <Radar dataKey="score" stroke="#FF5722" fill="#FF5722" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
              Pas de donnees disponibles
            </div>
          )}
        </div>

        {/* Pie Chart */}
        <div className="md:col-span-5 bg-white border border-slate-200 rounded-sm p-6">
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-4">Distribution des Scores</p>
          {pieData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} strokeWidth={1}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
              Pas de donnees disponibles
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}></span>
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="bg-white border border-slate-200 rounded-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Analyses Recentes</p>
          <button
            data-testid="view-all-history-btn"
            onClick={() => navigate("/historique")}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 uppercase tracking-wider"
          >
            Voir tout
          </button>
        </div>
        {data.recent_tickets?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="recent-tickets-table">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 pr-4 text-[10px] font-bold tracking-widest uppercase text-slate-400">Ref</th>
                  <th className="text-left py-2 pr-4 text-[10px] font-bold tracking-widest uppercase text-slate-400">Priorite</th>
                  <th className="text-left py-2 pr-4 text-[10px] font-bold tracking-widest uppercase text-slate-400">Score</th>
                  <th className="text-left py-2 pr-4 text-[10px] font-bold tracking-widest uppercase text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_tickets.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/historique`)} data-testid={`recent-ticket-${t.id}`}>
                    <td className="py-3 pr-4 font-mono text-sm">{t.ticket_ref || "N/A"}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-widest">
                        {t.priority || "N/A"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-bold" style={{ color: getScoreColor(t.score_global) }}>
                        {t.score_global}/10
                      </span>
                    </td>
                    <td className="py-3 text-slate-500 text-xs">
                      {new Date(t.created_at).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">Aucune analyse recente</p>
        )}
      </div>
    </div>
  );
}
