import { useState } from "react";
import { analyzeTicket } from "@/lib/api";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ScoreRing, { getScoreLabel, getScoreColor, getScoreClass } from "@/components/ScoreRing";
import { Search, Loader2, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

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
  comprehension: "Comprehension",
};

const SCORE_LABELS = { "-1": "NA", "0": "Mauvais", "1": "Moyen", "2": "Bon" };
const PRIORITY_OPTIONS = ["P1 - Critique", "P2 - Majeur", "P3 - Mineur", "P4 - Information"];

function ScoreIcon({ score }) {
  if (score === -1) return <span className="text-slate-400 text-xs font-bold">NA</span>;
  if (score === 2) return <CheckCircle size={16} className="text-emerald-500" />;
  if (score === 1) return <AlertTriangle size={16} className="text-amber-500" />;
  return <XCircle size={16} className="text-red-500" />;
}

function ScoreBadge({ score }) {
  if (score === -1) return <span className="bg-slate-100 text-slate-500 border border-slate-200 uppercase text-[10px] font-bold tracking-widest px-2 py-1 rounded-sm">NA</span>;
  if (score === 2) return <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase text-[10px] font-bold tracking-widest px-2 py-1 rounded-sm">Bon</span>;
  if (score === 1) return <span className="bg-amber-100 text-amber-700 border border-amber-200 uppercase text-[10px] font-bold tracking-widest px-2 py-1 rounded-sm">Moyen</span>;
  return <span className="bg-red-100 text-red-700 border border-red-200 uppercase text-[10px] font-bold tracking-widest px-2 py-1 rounded-sm">Mauvais</span>;
}

export default function AnalyseTicket() {
  const [content, setContent] = useState("");
  const [ticketRef, setTicketRef] = useState("");
  const [priority, setPriority] = useState("");
  const [agentName, setAgentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleAnalyze = async () => {
    if (!content.trim()) {
      toast.error("Veuillez coller le contenu du ticket");
      return;
    }
    setLoading(true);
    try {
      const res = await analyzeTicket({ content, ticket_ref: ticketRef, priority, agent_name: agentName });
      setResult(res.data);
      setSheetOpen(true);
      toast.success("Analyse terminee avec succes");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'analyse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8" data-testid="analyse-page">
      <h1 className="text-4xl font-bold tracking-tight uppercase text-slate-900 mb-1"
        style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
        Analyser un Ticket
      </h1>
      <p className="text-sm text-slate-500 mb-8">Collez le contenu du ticket d'incident pour une analyse qualite IA</p>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Input Area */}
        <div className="md:col-span-8">
          <div className="bg-white border border-slate-200 rounded-sm p-6">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block mb-2">
                  Reference Ticket
                </label>
                <input
                  data-testid="ticket-ref-input"
                  type="text"
                  value={ticketRef}
                  onChange={e => setTicketRef(e.target.value)}
                  placeholder="Ex: INC-2024-001234"
                  className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:border-orange-500 focus:outline-none bg-slate-50/50"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block mb-2">
                  Priorite
                </label>
                <select
                  data-testid="priority-select"
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:border-orange-500 focus:outline-none bg-slate-50/50"
                >
                  <option value="">Selectionner...</option>
                  {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block mb-2">
                  Agent / Technicien
                </label>
                <input
                  data-testid="agent-name-input"
                  type="text"
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  placeholder="Nom de l'agent"
                  className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:border-orange-500 focus:outline-none bg-slate-50/50"
                />
              </div>
            </div>
            <label className="text-[10px] font-bold tracking-widest uppercase text-slate-400 block mb-2">
              Contenu du Ticket
            </label>
            <textarea
              data-testid="ticket-content-input"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Collez ici le contenu complet du ticket d'incident..."
              rows={16}
              className="w-full border border-slate-300 rounded-sm px-4 py-3 text-sm font-mono leading-relaxed focus:border-orange-500 focus:outline-none bg-slate-50/50 resize-y min-h-[200px]"
            />
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-slate-400">{content.length} caracteres</span>
              <button
                data-testid="analyze-btn"
                onClick={handleAnalyze}
                disabled={loading || !content.trim()}
                className="bg-slate-900 text-white hover:bg-orange-600 rounded-sm uppercase tracking-wider text-xs font-bold px-8 py-3 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} strokeWidth={1.5} />}
                {loading ? "Analyse en cours..." : "Lancer l'Analyse"}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Guide */}
        <div className="md:col-span-4">
          <div className="bg-white border border-slate-200 rounded-sm p-6">
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-4">Guide d'Analyse</p>
            <div className="space-y-3 text-sm text-slate-600">
              <p>L'analyse IA evalue votre ticket sur <strong>11 criteres</strong> :</p>
              <ul className="space-y-1.5">
                {Object.entries(CRITERIA_LABELS).map(([k, v]) => (
                  <li key={k} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-sm flex-shrink-0"></span>
                    {v}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
                Bareme : NA (non visible), 0 = Mauvais, 1 = Moyen, 2 = Bon. Score global en % sur 100.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Result Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0" data-testid="analysis-sheet">
          {result && (
            <>
              <SheetHeader className="p-6 border-b border-slate-200 bg-slate-50">
                <div className="flex items-start gap-4">
                  <ScoreRing score={result.score_global} size="lg" isPercent />
                  <div className="flex-1">
                    <SheetTitle className="text-2xl font-bold tracking-tight uppercase"
                      style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
                      Resultat d'Analyse
                    </SheetTitle>
                    <SheetDescription asChild className="mt-1">
                      <div>
                        {result.ticket_ref && <span className="font-mono text-sm mr-3">{result.ticket_ref}</span>}
                        {result.agent_name && <span className="text-xs text-slate-500 mr-3">Agent: {result.agent_name}</span>}
                        <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-widest">
                          {result.score_global >= 80 ? "Excellent" : result.score_global >= 50 ? "Moyen" : "Faible"}
                        </Badge>
                      </div>
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <Tabs defaultValue="scores" className="px-6 pt-4 pb-6">
                <TabsList className="mb-4 bg-slate-100 rounded-sm">
                  <TabsTrigger value="scores" className="rounded-sm text-xs uppercase tracking-wider font-bold"
                    data-testid="tab-scores">Scores</TabsTrigger>
                  <TabsTrigger value="details" className="rounded-sm text-xs uppercase tracking-wider font-bold"
                    data-testid="tab-details">Details</TabsTrigger>
                  <TabsTrigger value="recommandations" className="rounded-sm text-xs uppercase tracking-wider font-bold"
                    data-testid="tab-recommandations">Recommandations</TabsTrigger>
                </TabsList>

                <TabsContent value="scores" data-testid="scores-tab-content">
                  <div className="space-y-3">
                    {Object.entries(result.scores || {}).map(([key, val]) => (
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

                <TabsContent value="details" data-testid="details-tab-content">
                  <div className="space-y-4">
                    {Object.entries(result.details || {}).map(([key, comment]) => (
                      <div key={key} className="border border-slate-200 rounded-sm p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <ScoreIcon score={result.scores?.[key] || 0} />
                          <span className="text-xs font-bold tracking-widest uppercase text-slate-500">
                            {CRITERIA_LABELS[key] || key}
                          </span>
                          <span className="ml-auto font-bold text-sm" style={{ color: getScoreColor(result.scores?.[key] || 0) }}>
                            {result.scores?.[key]}/10
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{comment}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="recommandations" data-testid="recommandations-tab-content">
                  {result.resume && (
                    <div className="bg-slate-900 text-white p-4 rounded-sm mb-4">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-orange-400 mb-2">Resume</p>
                      <p className="text-sm leading-relaxed">{result.resume}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {(result.recommandations || []).map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-sm">
                        <span className="text-orange-600 font-bold text-sm mt-0.5">{i + 1}.</span>
                        <p className="text-sm text-slate-700">{rec}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
