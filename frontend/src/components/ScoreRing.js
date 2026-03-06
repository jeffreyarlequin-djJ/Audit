export function getScoreClass(score) {
  if (score === -1) return "score-na";
  if (score === 2) return "score-excellent";
  if (score === 1) return "score-moyen";
  return "score-faible";
}

export function getScoreLabel(score) {
  if (score === -1) return "NA";
  if (score === 2) return "Bon";
  if (score === 1) return "Moyen";
  return "Mauvais";
}

export function getScoreColor(score) {
  if (score === -1) return "#94a3b8";
  if (score === 2) return "#10b981";
  if (score === 1) return "#f59e0b";
  return "#ef4444";
}

export function getGlobalScoreColor(pct) {
  if (pct >= 80) return "#10b981";
  if (pct >= 50) return "#f59e0b";
  return "#ef4444";
}

export function getGlobalScoreLabel(pct) {
  if (pct >= 80) return "Excellent";
  if (pct >= 50) return "Moyen";
  return "Faible";
}

export default function ScoreRing({ score, size = "md", isPercent = false }) {
  const dims = size === "lg" ? "w-20 h-20 text-xl border-[5px]" : "w-14 h-14 text-base border-4";
  const color = isPercent ? getGlobalScoreColor(score) : getScoreColor(score);
  const label = isPercent ? `${score}%` : getScoreLabel(score);
  const bgClass = isPercent
    ? (score >= 80 ? "border-emerald-500 bg-emerald-50 text-emerald-700" : score >= 50 ? "border-amber-500 bg-amber-50 text-amber-700" : "border-red-500 bg-red-50 text-red-700")
    : (score === -1 ? "border-slate-400 bg-slate-50 text-slate-500" : score === 2 ? "border-emerald-500 bg-emerald-50 text-emerald-700" : score === 1 ? "border-amber-500 bg-amber-50 text-amber-700" : "border-red-500 bg-red-50 text-red-700");

  return (
    <div
      data-testid="score-ring"
      className={`score-ring ${dims} ${bgClass}`}
      style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
    >
      {label}
    </div>
  );
}
