import { useState, useEffect } from "react";
import { getTickets, getTicket, deleteTicket } from "@/lib/api";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ScoreRing, { getScoreLabel, getScoreColor } from "@/components/ScoreRing";
import { Trash2, Eye, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

const CRITERIA_LABELS = {
  procedures: "Procedures", priorite: "Priorite", description: "Description",
  acquittement: "Acquittement", sla: "SLA", communication: "Communication",
  diagnostic: "Diagnostic", statut: "Statut", escalade: "Escalade", cloture: "Cloture",
};

function ScoreIcon({ score }) {
  if (score >= 7) return <CheckCircle size={14} className="text-emerald-500" />;
  if (score >= 4) return <AlertTriangle size={14} className="text-amber-500" />;
  return <XCircle size={14} className="text-red-500" />;
}

export default function Historique() {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = async () => {
    try {
      const res = await getTickets({ sort: "desc", limit: 100 });
      setTickets(res.data.tickets);
      setTotal(res.data.total);
    } catch (err) {
      toast.error("Erreur chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleView = async (id) => {
    try {
      const res = await getTicket(id);
      setSelected(res.data);
      setSheetOpen(true);
    } catch (err) {
      toast.error("Erreur chargement ticket");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette analyse ?")) return;
    try {
      await deleteTicket(id);
      toast.success("Analyse supprimee");
      load();
    } catch (err) {
      toast.error("Erreur suppression");
    }
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
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight uppercase text-slate-900"
          style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
          Historique
        </h1>
        <p className="text-sm text-slate-500 mt-1">{total} ticket(s) analyse(s)</p>
      </div>

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
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-widest">
                      {t.priority || "N/A"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold" style={{ color: getScoreColor(t.score_global) }}>
                      {t.score_global}/10
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`uppercase text-[10px] font-bold tracking-widest px-2 py-1 border rounded-sm ${
                      t.score_global >= 8 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                      t.score_global >= 6 ? "bg-blue-100 text-blue-700 border-blue-200" :
                      t.score_global >= 4 ? "bg-amber-100 text-amber-700 border-amber-200" :
                      "bg-red-100 text-red-700 border-red-200"
                    }`}>
                      {getScoreLabel(t.score_global)}
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
                  <ScoreRing score={selected.score_global} size="lg" />
                  <div className="flex-1">
                    <SheetTitle className="text-2xl font-bold tracking-tight uppercase"
                      style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
                      {selected.ticket_ref || "Ticket"}
                    </SheetTitle>
                    <SheetDescription>
                      <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-widest mr-2">
                        {selected.priority || "N/A"}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {new Date(selected.created_at).toLocaleDateString("fr-FR")}
                      </span>
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
                        <span className="text-xs font-bold tracking-widest uppercase text-slate-500 w-28">
                          {CRITERIA_LABELS[key] || key}
                        </span>
                        <div className="flex-1">
                          <Progress value={val * 10} className="h-2 bg-slate-200" />
                        </div>
                        <span className="font-bold text-sm w-12 text-right" style={{ color: getScoreColor(val) }}>
                          {val}/10
                        </span>
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
