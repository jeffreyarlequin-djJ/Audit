import { NavLink } from "react-router-dom";
import { LayoutDashboard, Search, FileText, Clock, BarChart3, Users } from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Tableau de Bord" },
  { to: "/analyse", icon: Search, label: "Analyser Ticket" },
  { to: "/templates", icon: FileText, label: "Templates" },
  { to: "/historique", icon: Clock, label: "Historique" },
  { to: "/statistiques", icon: BarChart3, label: "Statistiques" },
  { to: "/comparatif", icon: Users, label: "Comparatif Agents" },
];

export default function Sidebar() {
  return (
    <aside
      data-testid="sidebar-nav"
      className="fixed left-0 top-0 h-screen w-[240px] bg-white border-r border-slate-200 flex flex-col z-40"
    >
      <div className="p-6 border-b border-slate-200">
        <h1
          className="text-xl font-bold tracking-tight uppercase text-slate-900"
          style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
        >
          Swiss Telecom
        </h1>
        <span
          className="text-[10px] font-bold tracking-widest uppercase text-orange-600"
          style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
        >
          Quality Audit
        </span>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            data-testid={`nav-${to === "/" ? "dashboard" : to.slice(1)}`}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : "text-slate-500"}`
            }
          >
            <Icon size={18} strokeWidth={1.5} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
          SAV Telephonie N1
        </p>
      </div>
    </aside>
  );
}
