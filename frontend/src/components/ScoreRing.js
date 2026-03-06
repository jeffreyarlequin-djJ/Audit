export function getScoreClass(score) {
  if (score >= 8) return "score-excellent";
  if (score >= 6) return "score-bon";
  if (score >= 4) return "score-moyen";
  return "score-faible";
}

export function getScoreLabel(score) {
  if (score >= 8) return "Excellent";
  if (score >= 6) return "Bon";
  if (score >= 4) return "Moyen";
  return "Faible";
}

export function getScoreColor(score) {
  if (score >= 8) return "#10b981";
  if (score >= 6) return "#3b82f6";
  if (score >= 4) return "#f59e0b";
  return "#ef4444";
}

export default function ScoreRing({ score, size = "md" }) {
  const dims = size === "lg" ? "w-20 h-20 text-2xl border-[5px]" : "w-14 h-14 text-lg border-4";
  return (
    <div
      data-testid="score-ring"
      className={`score-ring ${getScoreClass(score)} ${dims}`}
      style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
    >
      {score}
    </div>
  );
}
