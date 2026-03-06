import { useState, useEffect } from "react";
import { getTemplates, updateTemplate, resetTemplates } from "@/lib/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { FileText, Save, RotateCcw, Edit3, X, Check } from "lucide-react";

const CATEGORY_COLORS = {
  acquittement: "bg-blue-100 text-blue-700 border-blue-200",
  criteres_entree: "bg-emerald-100 text-emerald-700 border-emerald-200",
  diagnostics: "bg-amber-100 text-amber-700 border-amber-200",
  communication: "bg-purple-100 text-purple-700 border-purple-200",
  cloture: "bg-red-100 text-red-700 border-red-200",
};

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const load = async () => {
    try {
      const res = await getTemplates();
      setTemplates(res.data);
    } catch (err) {
      toast.error("Erreur lors du chargement des templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleEdit = (t) => {
    setEditingId(t.id);
    setEditContent(t.content);
  };

  const handleSave = async (id) => {
    try {
      await updateTemplate(id, { content: editContent });
      setEditingId(null);
      toast.success("Template mis a jour");
      load();
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Reinitialiser tous les templates aux valeurs par defaut ?")) return;
    try {
      await resetTemplates();
      toast.success("Templates reinitialises");
      load();
    } catch (err) {
      toast.error("Erreur lors de la reinitialisation");
    }
  };

  if (loading) {
    return (
      <div className="p-8" data-testid="templates-loading">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 w-48"></div>
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-slate-100"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8" data-testid="templates-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight uppercase text-slate-900"
            style={{ fontFamily: '"Barlow Condensed", sans-serif' }}>
            Templates
          </h1>
          <p className="text-sm text-slate-500 mt-1">Modeles de procedures et communications</p>
        </div>
        <button
          data-testid="reset-templates-btn"
          onClick={handleReset}
          className="border border-slate-300 bg-transparent hover:border-slate-900 text-slate-900 rounded-sm uppercase tracking-wider text-xs font-bold px-6 py-3 flex items-center gap-2 transition-colors"
        >
          <RotateCcw size={14} strokeWidth={1.5} />
          Reinitialiser
        </button>
      </div>

      <div className="space-y-4">
        {templates.map((t) => (
          <div key={t.id} data-testid={`template-card-${t.category}`}
            className="bg-white border border-slate-200 rounded-sm overflow-hidden hover:border-slate-400 transition-colors">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <FileText size={18} strokeWidth={1.5} className="text-slate-400" />
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{t.name}</h3>
                  <p className="text-xs text-slate-500">{t.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`uppercase text-[10px] font-bold tracking-widest px-2 py-1 border rounded-sm ${CATEGORY_COLORS[t.category] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                  {t.category}
                </span>
                {editingId === t.id ? (
                  <div className="flex gap-1">
                    <button data-testid={`save-template-${t.id}`} onClick={() => handleSave(t.id)}
                      className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-sm transition-colors">
                      <Check size={16} />
                    </button>
                    <button data-testid={`cancel-edit-${t.id}`} onClick={() => setEditingId(null)}
                      className="p-2 hover:bg-red-50 text-red-600 rounded-sm transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button data-testid={`edit-template-${t.id}`} onClick={() => handleEdit(t)}
                    className="p-2 hover:bg-slate-100 text-slate-500 rounded-sm transition-colors">
                    <Edit3 size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="p-4">
              {editingId === t.id ? (
                <textarea
                  data-testid={`template-editor-${t.id}`}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={14}
                  className="w-full border border-slate-300 rounded-sm px-4 py-3 text-sm font-mono leading-relaxed focus:border-orange-500 focus:outline-none bg-slate-50/50 resize-none"
                />
              ) : (
                <pre className="text-sm font-mono text-slate-600 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {t.content}
                </pre>
              )}
            </div>
            <div className="px-4 pb-3">
              <span className="text-[10px] text-slate-400">
                Mis a jour : {new Date(t.updated_at).toLocaleDateString("fr-FR")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
