import { useState, useEffect } from "react";
import { getTickets, getTicket, deleteTicket, exportTickets } from "@/lib/api";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ScoreRing, { getScoreLabel, getScoreColor, getGlobalScoreColor, getGlobalScoreLabel } from "@/components/ScoreRing";
import { Trash2, Eye, CheckCircle, AlertTriangle, XCircle, Download, Filter, X } from "lucide-react";

const CRITERIA_LABELS = {
  procedures: "Procedures", priorite: "Priorite", description: "Description",
  acquittement: "Acquittement", sla: "SLA", communication: "Communication",
  diagnostic: "Diagnostic", statut: "Statut", escalade: "Escalade", cloture: "Cloture",
  comprehension: "Comprehension",
};

function ScoreIcon({ score }) {
  if (score === -1) return <span className="text-slate-400 text-xs font-bold">NA</span>;
  if (score === 2) return <CheckCircle size={14} className="text-emerald-500" />;
  if (score === 1) return <AlertTriangle size={14} className="text-amber-500" />;
  return <XCircle size={14} className="text-red-500" />;
}

function ScoreBadge({ score }) {
  if (score === -1) return <span className="bg-slate-100 text-slate-500 border border-slate-200 uppercase text-[10px] font-bold tracking-widest px-2 py-1 rounded-sm">NA</span>;
  if (score === 2) return <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase text-[10px] font-bold tracking-widest px-2 py-1 rounded-sm">Bon</span>;
  if (score === 1) return <span className="bg-amber-100 text-amber-700 border border-amber-200 uppercase text-[10px] font-bold tracking-widest px-2 py-1 rounded-sm">Moyen</span>;
  return <span className="bg-red-100 text-red-700 border border-red-200 uppercase text-[10px] font-bold tracking-widest px-2 py-1 rounded-sm">Mauvais</span>;
}

export default function Historique() {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filters, setFilters] = useState({ agent: "", priority: "", score_min: "", score_max: "" });
  const [showFilters, setShowFilters] = useState(false);

  const load = async (filterParams) => {
    try {
      const params = { sort: "desc", limit: 100 };
      if (filterParams?.agent) params.agent = filterParams.agent;
      if (filterParams?.priority) params.priority = filterParams.priority;
      if (filterParams?.score_min) params.score_min = parseFloat(filterParams.score_min);
      if (filterParams?.score_max) params.score_max = parseFloat(filterParams.score_max);
      const res = await getTickets(params);
      setTickets(res.data.tickets);
      setTotal(res.data.total);
    } catch (err) {
      toast.error("Erreur chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filters); }, []);

  const applyFilters = () => { setLoading(true); load(filters); };
  const clearFilters = () => { const empty = { agent: "", priority: "", score_min: "", score_max: "" }; setFilters(empty); setLoading(true); load(empty); };

  const handleView = async (id) => {
    try { const res = await getTicket(id); setSelected(res.data); setSheetOpen(true); } catch (err) { toast.error("Erreur chargement ticket"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette analyse ?")) return;
    try { await deleteTicket(id); toast.success("Analyse supprimee"); load(filters); } catch (err) { toast.error("Erreur suppression"); }
  };

  const handleExport = () => {
    const url = exportTickets(filters);
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="p-8" data-testid="historique-loading">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 w-48"></div>
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8" data-testid="historique-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight uppercase text-slate-900"
            style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
            Historique
          </h1>
          <p className="text-sm text-slate-500 mt-1">{total} ticket(s) analyse(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="toggle-filters-btn" onClick={() => setShowFilters(!showFilters)}
            className="border border-slate-300 bg-transparent hover:border-slate-900 text-slate-900 rounded-sm uppercase tracking-wider text-xs font-bold px-4 py-2.5 flex items-center gap-2 transition-colors">
            <Filter size={14} /> Filtres
          </button>
          <button data-testid="export-csv-btn" onClick={handleExport}
            className="bg-slate-900 text-white hover:bg-orange-600 rounded-sm uppercase tracking-wider text-xs font-bold px-4 py-2.5 flex items-center gap-2 transition-colors duration-200">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-sm p-4 mb-4 animate-fade-in-up" data-testid="filters-panel">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block mb-1">Agent</label>
              <input data-testid="filter-agent" type="text" value={filters.agent} onChange={e => setFilters({...filters, agent: e.target.value})}
                placeholder="Nom agent" className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:border-orange-500 focus:outline-none bg-slate-50/50" />
            </div>
            <div>
              <label className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block mb-1">Priorite</label>
              <select data-testid="filter-priority" value={filters.priority} onChange={e => setFilters({...filters, priority: e.target.value})}
                className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:border-orange-500 focus:outline-none bg-slate-50/50">
                <option value="">Toutes</option>
                <option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option><option value="P4">P4</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block mb-1">Score Min (%)</label>
              <input data-testid="filter-score-min" type="number" min="0" max="100" value={filters.score_min} onChange={e => setFilters({...filters, score_min: e.target.value})}
                placeholder="0" className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:border-orange-500 focus:outline-none bg-slate-50/50" />
            </div>
            <div>
              <label className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block mb-1">Score Max (%)</label>
              <input data-testid="filter-score-max" type="number" min="0" max="100" value={filters.score_max} onChange={e => setFilters({...filters, score_max: e.target.value})}
                placeholder="100" className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:border-orange-500 focus:outline-none bg-slate-50/50" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button data-testid="clear-filters-btn" onClick={clearFilters}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-wider px-3 py-1.5 flex items-center gap-1">
              <X size={12} /> Effacer
            </button>
            <button data-testid="apply-filters-btn" onClick={applyFilters}
              className="bg-slate-900 text-white hover:bg-orange-600 rounded-sm uppercase tracking-wider text-xs font-bold px-4 py-2 transition-colors duration-200">
              Appliquer
            </button>
          </div>
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-sm p-12 text-center">
          <p className="text-slate-500">Aucun ticket analyse pour le moment.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
          <table className="w-full text-sm" data-testid="history-table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-[10px] font-bold tracking-widest uppercase text-slate-400">Ref</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold tracking-widest uppercase text-slate-400">Agent</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold tracking-widest uppercase text-slate-400">Priorite</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold tracking-widest uppercase text-slate-400">Score</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold tracking-widest uppercase text-slate-400">Qualite</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold tracking-widest uppercase text-slate-400">Date</th>
                <th className="text-right py-3 px-4 text-[10px] font-bold tracking-widest uppercase text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  data-testid={`history-row-${t.id}`}>
                  <td className="py-3 px-4 font-mono text-sm">{t.ticket_ref || "N/A"}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{t.agent_name || "-"}</td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-widest">
                      {t.priority || "N/A"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold" style={{ color: getGlobalScoreColor(t.score_global) }}>
                      {t.score_global}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`uppercase text-[10px] font-bold tracking-widest px-2 py-1 border rounded-sm ${
                      t.score_global >= 80 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                      t.score_global >= 50 ? "bg-amber-100 text-amber-700 border-amber-200" :
                      "bg-red-100 text-red-700 border-red-200"
                    }`}>
                      {getGlobalScoreLabel(t.score_global)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500">
                    {new Date(t.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button data-testid={`view-ticket-${t.id}`} onClick={() => handleView(t.id)}
                        className="p-2 hover:bg-slate-100 text-slate-500 rounded-sm transition-colors">
                        <Eye size={16} strokeWidth={1.5} />
                      </button>
                      <button data-testid={`delete-ticket-${t.id}`} onClick={() => handleDelete(t.id)}
                        className="p-2 hover:bg-red-50 text-red-400 rounded-sm transition-colors">
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0" data-testid="detail-sheet">
          {selected && (
            <>
              <SheetHeader className="p-6 border-b border-slate-200 bg-slate-50">
                <div className="flex items-start gap-4">
                  <ScoreRing score={selected.score_global} size="lg" isPercent />
                  <div className="flex-1">
                    <SheetTitle className="text-2xl font-bold tracking-tight uppercase"
                      style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
                      {selected.ticket_ref || "Ticket"}
                    </SheetTitle>
                    <SheetDescription asChild>
                      <div>
                        <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-widest mr-2">
                          {selected.priority || "N/A"}
                        </Badge>
                        {selected.agent_name && <span className="text-xs text-slate-500 mr-2">Agent: {selected.agent_name}</span>}
                        <span className="text-xs text-slate-500">
                          {new Date(selected.created_at).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <Tabs defaultValue="scores" className="px-6 pt-4 pb-6">
                <TabsList className="mb-4 bg-slate-100 rounded-sm">
                  <TabsTrigger value="scores" className="rounded-sm text-xs uppercase tracking-wider font-bold">Scores</TabsTrigger>
                  <TabsTrigger value="details" className="rounded-sm text-xs uppercase tracking-wider font-bold">Details</TabsTrigger>
                  <TabsTrigger value="contenu" className="rounded-sm text-xs uppercase tracking-wider font-bold">Contenu</TabsTrigger>
                </TabsList>

                <TabsContent value="scores">
                  <div className="space-y-3">
                    {Object.entries(selected.scores || {}).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-sm">
                        <ScoreIcon score={val} />
                        <span className="text-xs font-bold tracking-widest uppercase text-slate-500 w-32">
                          {CRITERIA_LABELS[key] || key}
                        </span>
                        <div className="flex-1">
                          <ScoreBadge score={val} />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="details">
                  <div className="space-y-4">
                    {Object.entries(selected.details || {}).map(([key, comment]) => (
                      <div key={key} className="border border-slate-200 rounded-sm p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <ScoreIcon score={selected.scores?.[key] || 0} />
                          <span className="text-xs font-bold tracking-widest uppercase text-slate-500">
                            {CRITERIA_LABELS[key] || key}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{comment}</p>
                      </div>
                    ))}
                    {selected.resume && (
                      <div className="bg-slate-900 text-white p-4 rounded-sm">
                        <p className="text-[10px] font-bold tracking-widest uppercase text-orange-400 mb-2">Resume</p>
                        <p className="text-sm leading-relaxed">{selected.resume}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="contenu">
                  <pre className="text-sm font-mono text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-sm p-4">
                    {selected.content}
                  </pre>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
