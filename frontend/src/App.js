import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import Dashboard from "@/pages/Dashboard";
import AnalyseTicket from "@/pages/AnalyseTicket";
import Templates from "@/pages/Templates";
import Historique from "@/pages/Historique";
import Statistiques from "@/pages/Statistiques";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-white">
        <Sidebar />
        <main className="flex-1 ml-[240px] grid-bg">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analyse" element={<AnalyseTicket />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/historique" element={<Historique />} />
            <Route path="/statistiques" element={<Statistiques />} />
          </Routes>
        </main>
        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  );
}

export default App;
