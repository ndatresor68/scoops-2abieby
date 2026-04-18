import React from 'react';
import {
  FaChartLine,
  FaComments,
  FaCog,
  FaBriefcase,
  FaEnvelope,
  FaInfoCircle,
  FaStore,
  FaShieldAlt,
  FaUserShield,
  FaUsers,
  FaWeightHanging,
  FaTimes,
  FaSeedling,
  FaClipboardList,
  FaTruck,
} from "react-icons/fa";
import logoImage from "../assets/logo-scoops.png";
import { useAuth } from "../context/AuthContext";

const ADMIN_MODULES = [
  { id: "dashboard", label: "Dashboard", icon: FaChartLine },
  { id: "chat", label: "Chat", icon: FaComments },
  { id: "opportunites", label: "Opportunites", icon: FaBriefcase },
  { id: "centres", label: "Centres", icon: FaStore },
  { id: "admin-users", label: "Utilisateurs", icon: FaUsers },
  { id: "producteurs", label: "Producteurs", icon: FaUsers },
  { id: "achats", label: "Pesées", icon: FaWeightHanging },
  { id: "admin", label: "Administration", icon: FaUserShield },
  { id: "parametres", label: "Paramètres", icon: FaCog },
];

const AGENT_MODULES = [
  { id: "dashboard", label: "Dashboard", icon: FaChartLine },
  { id: "chat", label: "Chat", icon: FaComments },
  { id: "opportunites", label: "Opportunites", icon: FaBriefcase },
  { id: "producteurs", label: "Producteurs", icon: FaUsers },
  { id: "parcelles", label: "Parcelles", icon: FaSeedling },
  { id: "activites", label: "Activités terrain", icon: FaClipboardList },
];

const CENTRE_MODULES = [
  { id: "dashboard", label: "Dashboard", icon: FaChartLine },
  { id: "chat", label: "Chat", icon: FaComments },
  { id: "opportunites", label: "Opportunites", icon: FaBriefcase },
  { id: "producteurs", label: "Producteurs", icon: FaUsers },
  { id: "achats", label: "Achats", icon: FaWeightHanging },
  { id: "parcelles", label: "Gestion Parcelles", icon: FaSeedling },
  { id: "livraisons", label: "Livraisons", icon: FaTruck },
  { id: "parametres", label: "Paramètres", icon: FaCog },
];

const LEGAL_MODULES = [
  { id: "about", label: "À propos", icon: FaInfoCircle },
  { id: "contact", label: "Contact", icon: FaEnvelope },
  { id: "privacy", label: "Confidentialité", icon: FaShieldAlt },
];

export default function Navbar({
  activePage,
  onNavigate,
  collapsed,
  mobileOpen,
  onCloseMobile,
  isMobile,
}) {
  const { isAdmin, isAgent, isCentre } = useAuth();

  let modules = [];
  if (isAdmin) {
    modules = ADMIN_MODULES;
  } else if (isAgent) {
    modules = AGENT_MODULES;
  } else if (isCentre) {
    modules = CENTRE_MODULES;
  } else {
    modules = [
      { id: "dashboard", label: "Dashboard", icon: FaChartLine },
      { id: "producteurs", label: "Producteurs", icon: FaUsers },
    ];
  }

  const SidebarItem = ({ module, active }) => {
    const Icon = module.icon;
    return (
      <button
        onClick={() => {
          onNavigate(module.id);
          if (mobileOpen) onCloseMobile();
        }}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group
          ${active 
            ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30' 
            : 'text-slate-400 hover:bg-white/10 hover:text-white'
          }
        `}
      >
        <Icon className={`text-xl flex-shrink-0 ${active ? 'text-white' : 'group-hover:scale-110 transition-transform'}`} />
        {(!collapsed || isMobile) && (
          <span className="font-bold text-sm tracking-wide whitespace-nowrap">{module.label}</span>
        )}
      </button>
    );
  };

  return (
    <>
      {isMobile && mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1200]"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 bottom-0 bg-slate-900 text-white z-[1300] transition-all duration-300 ease-in-out
          flex flex-col shadow-2xl
          ${collapsed && !isMobile ? 'w-20' : 'w-72'}
          ${isMobile ? (mobileOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        `}
      >
        <div className="p-6 flex items-center justify-between">
          {(!collapsed || isMobile) && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex-shrink-0 flex items-center justify-center shadow-lg shadow-primary-600/20 overflow-hidden">
                <img src={logoImage} alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col animate-fadeIn">
                <span className="font-black text-lg tracking-tighter leading-none">SCOOP ASAB</span>
                <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest mt-1">Gestion Coopérative</span>
              </div>
            </div>
          )}
          {isMobile && (
            <button onClick={onCloseMobile} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <FaTimes className="text-xl" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto scrollbar-hide">
          <div className="space-y-1">
            {modules.map(module => (
              <SidebarItem key={module.id} module={module} active={activePage === module.id} />
            ))}
          </div>

          <div className="pt-6 mt-6 border-t border-white/5">
            {(!collapsed || isMobile) && (
              <p className="px-4 mb-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Informations</p>
            )}
            <div className="space-y-1">
              {LEGAL_MODULES.map(module => (
                <SidebarItem key={module.id} module={module} active={activePage === module.id} />
              ))}
            </div>
          </div>
        </nav>

        {(!collapsed || isMobile) && (
          <div className="p-6 bg-white/5 m-4 rounded-3xl border border-white/5">
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              &copy; 2026 SCOOP ASAB.<br/>Version 2.1.0-Premium
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
