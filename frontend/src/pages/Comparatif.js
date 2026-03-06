import { useState, useEffect } from "react";
import { compareAgents } from "@/lib/api";
import { toast } from "sonner";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend } from "recharts";
import { getGlobalScoreColor } from "@/components/ScoreRing";
import { Users } from "lucide-react";

const CRITERIA_LABELS = {
  procedures: "Procedures", priorite: "Priorite", description: "Description",
  acquittement: "Acquittement", sla: "SLA", communication: "Communication",
  diagnostic: "Diagnostic", statut: "Statut", escalade: "Escalade", cloture: "Cloture",
  comprehension: "Comprehension",
};

const AGENT_COLORS = ["#0F172A", "#FF5722", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

function ScoreBadge({ score }) {
  if (score === undefined || score === null) return <span className="text-xs text-slate-400">-</span>;
  const val = Math.round(score * 100) / 100;
  if (val < 0) return <span className="bg-slate-100 text-slate-500 border border-slate-200 uppercase text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-sm">NA</span>;
  if (val >= 1.5) return <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-sm">{val.toFixed(1)}</span>;
  if (val >= 0.5) return <span className="bg-amber-100 text-amber-700 border border-amber-200 uppercase text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-sm">{val.toFixed(1)}</span>;
  return <span className="bg-red-100 text-red-700 border border-red-200 uppercase text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-sm">{val.toFixed(1)}</span>;
}

export default function Comparatif() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    compareAgents().then(r => { setAgents(r.data); setLoading(false); })
      .catch(() => { toast.error("Erreur chargement"); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="p-8" data-testid="comparatif-loading">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 w-48"></div>
          <div className="h-64 bg-slate-100"></div>
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="p-6 md:p-8" data-testid="comparatif-empty">
        <h1 className="text-4xl font-bold tracking-tight uppercase text-slate-900 mb-4"
          style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
          Comparatif Agents
        </h1>
        <div className="bg-white border border-slate-200 rounded-sm p-12 text-center">
          <Users size={48} strokeWidth={1} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">Aucun agent trouve. Analysez des tickets en renseignant le nom de l'agent pour voir le comparatif.</p>
        </div>
      </div>
    );
  }

  // Prepare radar data
  const radarData = Object.keys(CRITERIA_LABELS).map(c => {
    const entry = { criteria: CRITERIA_LABELS[c] };
    agents.forEach(a => {
      const val = a.criteria?.[c];
      entry[a.agent_name] = val !== null && val !== undefined && val >= 0 ? val : 0;
    });
    return entry;
  });

  return (
    <div className="p-6 md:p-8" data-testid="comparatif-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight uppercase text-slate-900"
          style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
          Comparatif Agents
        </h1>
        <p className="text-sm text-slate-500 mt-1">{agents.length} agent(s) identifies</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {agents.map((a, i) => (
          <div key={a.agent_name} data-testid={`agent-card-${i}`}
            className="bg-white border border-slate-200 rounded-sm p-5 hover:border-slate-400 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: AGENT_COLORS[i % AGENT_COLORS.length] }}></div>
              <span className="text-sm font-bold text-slate-900 truncate">{a.agent_name}</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold tracking-tight" style={{ fontFamily: '"Barlow Condensed", sans-serif', color: getGlobalScoreColor(a.avg_score) }}>
                  {a.avg_score}%
                </p>
                <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mt-1">Score Moyen</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-700" style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
                  {a.ticket_count}
                </p>
                <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Tickets</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Radar Comparison */}
      <div className="bg-white border border-slate-200 rounded-sm p-6 mb-6">
        <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-4">Comparaison des Profils</p>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="criteria" tick={{ fontSize: 10, fill: "#64748b" }} />
            {agents.map((a, i) => (
              <Radar key={a.agent_name} dataKey={a.agent_name} name={a.agent_name}
                stroke={AGENT_COLORS[i % AGENT_COLORS.length]}
                fill={AGENT_COLORS[i % AGENT_COLORS.length]}
                fillOpacity={0.08} strokeWidth={2} />
            ))}
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Table */}
      <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Detail par Critere</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="comparatif-table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-[10px] font-bold tracking-widest uppercase text-slate-400 sticky left-0 bg-slate-50">Critere</th>
                {agents.map((a, i) => (
                  <th key={a.agent_name} className="text-center py-3 px-4 text-[10px] font-bold tracking-widest uppercase" style={{ color: AGENT_COLORS[i % AGENT_COLORS.length] }}>
                    {a.agent_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <td className="py-3 px-4 text-xs font-bold text-slate-700 uppercase tracking-wider sticky left-0 bg-slate-50/50">Score Global</td>
                {agents.map(a => (
                  <td key={a.agent_name} className="py-3 px-4 text-center">
                    <span className="font-bold text-sm" style={{ color: getGlobalScoreColor(a.avg_score) }}>{a.avg_score}%</span>
                  </td>
                ))}
              </tr>
              {Object.entries(CRITERIA_LABELS).map(([key, label]) => (
                <tr key={key} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-white">{label}</td>
                  {agents.map(a => (
                    <td key={a.agent_name} className="py-3 px-4 text-center">
                      <ScoreBadge score={a.criteria?.[key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
