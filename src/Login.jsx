import { useState } from "react";
import {
  FaArrowRight,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaPhoneAlt,
  FaUser,
  FaChartLine,
  FaSeedling
} from "react-icons/fa";
import { useAuth } from "./context/AuthContext";
import { useSettings, useUserRegistration } from "./context/SettingsContext";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useTranslation } from "./utils/i18n";
import logoImage from "./assets/logo-scoops.png";
import Button from "./components/ui/Button";
import Input from "./components/ui/Input";

export default function Login() {
  const { signInWithPassword } = useAuth();
  const { settings } = useSettings();
  const allowRegistration = useUserRegistration();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const contactEmail = settings?.contact_email || "ndatresor68@gmail.com";
  const contactPhone = settings?.contact_phone || "0715887556";
  const cooperativeName = settings?.cooperative_name || "SCOOP ASAB";

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error: authError } = await signInWithPassword(email, password);
      if (authError) {
        setError(authError.message || "Email ou mot de passe incorrect");
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[2.5rem] shadow-premium overflow-hidden border border-slate-100">
        
        {/* Left Side - Branding (Hidden on mobile) */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-600/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white rounded-2xl p-2 shadow-xl mb-8">
              <img src={settings?.logo_url || logoImage} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-5xl font-black tracking-tighter mb-4 leading-tight">
              {cooperativeName}
            </h1>
            <p className="text-slate-400 text-lg font-medium max-w-sm leading-relaxed">
              La plateforme intelligente pour la gestion de votre coopérative agricole.
            </p>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary-600 transition-colors duration-300">
                <FaChartLine className="text-xl" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Suivi en temps réel</h4>
                <p className="text-xs text-slate-500">Visualisez vos performances instantanément.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary-600 transition-colors duration-300">
                <FaSeedling className="text-xl" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Gestion Terrain</h4>
                <p className="text-xs text-slate-500">Optimisé pour une utilisation hors-ligne.</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-8 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>&copy; 2026 SCOOP ASAB</span>
            <span>v2.1.0 Premium</span>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
          <div className="mb-10 lg:hidden flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-50 rounded-2xl p-2">
              <img src={settings?.logo_url || logoImage} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl font-black tracking-tighter text-slate-900">{cooperativeName}</h2>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Bon retour !</h2>
            <p className="text-slate-500 font-medium">Connectez-vous pour accéder à votre espace.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <Input
              label="Adresse Email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={setEmail}
              icon={<FaEnvelope />}
              required
            />

            <div className="relative">
              <Input
                label="Mot de passe"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={setPassword}
                icon={<FaLock />}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-[38px] text-slate-400 hover:text-primary-600 transition-colors"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-fadeIn">
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-[10px] font-bold">!</span>
                </div>
                <p className="text-sm text-red-700 font-semibold leading-relaxed">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              icon={<FaArrowRight />}
              className="mt-4"
            >
              Se connecter
            </Button>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-100">
            <p className="text-center text-sm text-slate-500 font-medium mb-6">Besoin d'aide ?</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors bg-primary-50 px-4 py-2 rounded-full">
                <FaEnvelope /> {contactEmail}
              </a>
              <a href={`tel:${contactPhone}`} className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors bg-slate-100 px-4 py-2 rounded-full">
                <FaPhoneAlt /> {contactPhone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
