import React, { useState, useEffect } from "react";
import {
  X,
  Key,
  Sparkles,
  MapPin,
  Database,
  ExternalLink,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  HelpCircle,
  Activity,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiUsageService, ApiUsageStats, ApiBudgetLimits } from "../../services/apiUsageService";
import { toast } from "../../services/toastService";

interface ApiBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "budget" | "byok" | "guide";

export const ApiBudgetModal: React.FC<ApiBudgetModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("budget");
  const [stats, setStats] = useState<ApiUsageStats>(apiUsageService.getStats());
  const [limits, setLimits] = useState<ApiBudgetLimits>(apiUsageService.getLimits());

  const [customMapsKey, setCustomMapsKey] = useState(apiUsageService.getCustomMapsKey());
  const [customGeminiKey, setCustomGeminiKey] = useState(apiUsageService.getCustomGeminiKey());
  
  const [showMapsKey, setShowMapsKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isTestingMaps, setIsTestingMaps] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);

  useEffect(() => {
    const unsub = apiUsageService.subscribe((newStats) => {
      setStats(newStats);
      setLimits(apiUsageService.getLimits());
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const totalMapsCalls = stats.mapsSearchCalls + stats.mapsPhotoCalls + stats.mapsRouteCalls;
  const mapsPercent = Math.min(100, Math.round((totalMapsCalls / limits.dailyMapsLimit) * 100));
  const geminiPercent = Math.min(100, Math.round((stats.geminiCalls / limits.dailyGeminiLimit) * 100));


  const getProgressColor = (percent: number) => {
    if (percent >= 90) return "bg-red-500";
    if (percent >= 70) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const handleSaveCustomKeys = () => {
    apiUsageService.setCustomMapsKey(customMapsKey);
    apiUsageService.setCustomGeminiKey(customGeminiKey);
    toast.success("API keys updated successfully.", "BYOK Saved");
  };

  const handleResetUsage = () => {
    apiUsageService.resetStats();
    toast.info("Daily API usage stats reset.", "Stats Reset");
  };

  const handleTestMapsKey = async () => {
    const keyToTest = customMapsKey.trim() || apiUsageService.getActiveMapsKey();
    if (!keyToTest) {
      toast.error("Please enter a Google Maps API key to test.", "Missing Key");
      return;
    }
    setIsTestingMaps(true);
    try {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": keyToTest,
          "X-Goog-FieldMask": "places.id,places.displayName",
        },
        body: JSON.stringify({ textQuery: "Tokyo Station" }),
      });
      if (res.ok) {
        toast.success("Google Maps API Key is valid and working!", "Key Valid");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || `Failed with HTTP ${res.status}`, "Key Test Failed");
      }
    } catch (e: any) {
      toast.error(e.message || "Network test failed", "Key Test Failed");
    } finally {
      setIsTestingMaps(false);
    }
  };

  const handleTestGeminiKey = async () => {
    const keyToTest = customGeminiKey.trim() || apiUsageService.getActiveGeminiKey();
    if (!keyToTest) {
      toast.error("Please enter a Gemini API key to test.", "Missing Key");
      return;
    }
    setIsTestingGemini(true);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${keyToTest}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Respond with: ok" }] }],
          }),
        }
      );
      if (res.ok) {
        toast.success("Gemini API Key is valid and working!", "Key Valid");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error?.message || `Failed with HTTP ${res.status}`, "Key Test Failed");
      }
    } catch (e: any) {
      toast.error(e.message || "Network test failed", "Key Test Failed");
    } finally {
      setIsTestingGemini(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          className="bg-white dark:bg-surface-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-surface-200 dark:border-surface-700 transition-colors"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-surface-900 dark:text-white">
                  API Usage & Budget Monitor
                </h2>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  Track free-tier limits, cache savings, and personal API keys
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-surface-200 dark:border-surface-700 px-6 bg-surface-50/30 dark:bg-surface-900/20">
            <button
              onClick={() => setActiveTab("budget")}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === "budget"
                  ? "border-primary-500 text-primary-600 dark:text-primary-400"
                  : "border-transparent text-surface-500 hover:text-surface-800 dark:hover:text-surface-200"
              }`}
            >
              <Activity className="w-4 h-4" />
              Usage & Budget
            </button>
            <button
              onClick={() => setActiveTab("byok")}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === "byok"
                  ? "border-primary-500 text-primary-600 dark:text-primary-400"
                  : "border-transparent text-surface-500 hover:text-surface-800 dark:hover:text-surface-200"
              }`}
            >
              <Key className="w-4 h-4" />
              Bring Your Own Key (BYOK)
              {(customMapsKey || customGeminiKey) && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("guide")}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
                activeTab === "guide"
                  ? "border-primary-500 text-primary-600 dark:text-primary-400"
                  : "border-transparent text-surface-500 hover:text-surface-800 dark:hover:text-surface-200"
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              How to Get Free Keys
            </button>
          </div>

          {/* Tab Contents */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            {/* TAB 1: USAGE & BUDGET */}
            {activeTab === "budget" && (
              <div className="space-y-6">
                {/* Summary Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-surface-700 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-xs font-medium text-surface-500 dark:text-surface-400">
                      Google Maps Calls
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-surface-900 dark:text-white">
                        {totalMapsCalls}
                      </span>
                      <span className="text-xs text-surface-400">/ {limits.dailyMapsLimit} daily</span>
                    </div>
                    <span className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 mt-1">
                      {mapsPercent}% of limit
                    </span>
                  </div>

                  <div className="bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-surface-700 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-xs font-medium text-surface-500 dark:text-surface-400">
                      Gemini AI Calls
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-surface-900 dark:text-white">
                        {stats.geminiCalls}
                      </span>
                      <span className="text-xs text-surface-400">/ {limits.dailyGeminiLimit} daily</span>
                    </div>
                    <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-1">
                      {geminiPercent}% of limit
                    </span>
                  </div>

                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5" /> Cache Savings
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                        {stats.cacheHits}
                      </span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-500">saved calls</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                      Zero quota cost
                    </span>
                  </div>
                </div>

                {/* Meter Progress Bars */}
                <div className="space-y-4 bg-surface-50 dark:bg-surface-900/40 border border-surface-200 dark:border-surface-700 rounded-xl p-5">
                  <h3 className="text-xs font-bold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
                    Daily Quota Consumption ({stats.date})
                  </h3>

                  {/* Maps Progress */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-surface-700 dark:text-surface-200 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary-500" /> Google Maps API
                      </span>
                      <span className="font-mono text-surface-500 dark:text-surface-400">
                        {totalMapsCalls} / {limits.dailyMapsLimit} ({mapsPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-surface-200 dark:bg-surface-700 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(mapsPercent)}`}
                        style={{ width: `${mapsPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Gemini Progress */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-surface-700 dark:text-surface-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Google Gemini AI
                      </span>
                      <span className="font-mono text-surface-500 dark:text-surface-400">
                        {stats.geminiCalls} / {limits.dailyGeminiLimit} ({geminiPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-surface-200 dark:bg-surface-700 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(geminiPercent)}`}
                        style={{ width: `${geminiPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Request Breakdown */}
                <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
                    Detailed Call Breakdown
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-surface-50 dark:bg-surface-900/40">
                      <span className="text-surface-500 dark:text-surface-400 block">Places Search</span>
                      <span className="text-base font-bold text-surface-900 dark:text-white font-mono">
                        {stats.mapsSearchCalls}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface-50 dark:bg-surface-900/40">
                      <span className="text-surface-500 dark:text-surface-400 block">Photo Fetches</span>
                      <span className="text-base font-bold text-surface-900 dark:text-white font-mono">
                        {stats.mapsPhotoCalls}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface-50 dark:bg-surface-900/40">
                      <span className="text-surface-500 dark:text-surface-400 block">Route Matrices</span>
                      <span className="text-base font-bold text-surface-900 dark:text-white font-mono">
                        {stats.mapsRouteCalls}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface-50 dark:bg-surface-900/40">
                      <span className="text-surface-500 dark:text-surface-400 block">AI Summaries</span>
                      <span className="text-base font-bold text-surface-900 dark:text-white font-mono">
                        {stats.geminiCalls}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reset button */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-surface-400">
                    Daily stats reset automatically at midnight UTC.
                  </span>
                  <button
                    onClick={handleResetUsage}
                    className="flex items-center gap-1.5 text-xs font-semibold text-surface-500 hover:text-surface-800 dark:hover:text-surface-200 px-3 py-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Counters
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: BRING YOUR OWN KEY (BYOK) */}
            {activeTab === "byok" && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
                    <p className="font-bold">Your keys remain 100% private in your browser</p>
                    <p className="text-blue-700 dark:text-blue-300">
                      Keys entered here are stored strictly in your browser's <code className="bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded">localStorage</code> and are never transmitted to our servers.
                    </p>
                  </div>
                </div>

                {/* Google Maps Key Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-surface-700 dark:text-surface-200 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary-500" />
                      Google Maps API Key
                    </label>
                    <span className="text-[11px] font-semibold text-surface-400">
                      {customMapsKey ? "🟢 Custom Key Active" : "🌐 Default Key Active"}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showMapsKey ? "text" : "password"}
                      value={customMapsKey}
                      onChange={(e) => setCustomMapsKey(e.target.value)}
                      placeholder="AIzaSy... (leave blank to use default public key)"
                      className="w-full h-10 text-xs bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl px-3 pr-20 text-surface-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowMapsKey(!showMapsKey)}
                        className="p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
                      >
                        {showMapsKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleTestMapsKey}
                        disabled={isTestingMaps}
                        className="text-[10px] font-bold bg-surface-200 dark:bg-surface-700 hover:bg-surface-300 px-2 py-1 rounded text-surface-700 dark:text-surface-200 transition-colors"
                      >
                        {isTestingMaps ? "Testing..." : "Test"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Gemini AI Key Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-surface-700 dark:text-surface-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      Google Gemini API Key
                    </label>
                    <span className="text-[11px] font-semibold text-surface-400">
                      {customGeminiKey ? "🟢 Custom Key Active" : "🌐 Default Key Active"}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showGeminiKey ? "text" : "password"}
                      value={customGeminiKey}
                      onChange={(e) => setCustomGeminiKey(e.target.value)}
                      placeholder="AIzaSy... (leave blank to use default public key)"
                      className="w-full h-10 text-xs bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl px-3 pr-20 text-surface-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                        className="p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
                      >
                        {showGeminiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={handleTestGeminiKey}
                        disabled={isTestingGemini}
                        className="text-[10px] font-bold bg-surface-200 dark:bg-surface-700 hover:bg-surface-300 px-2 py-1 rounded text-surface-700 dark:text-surface-200 transition-colors"
                      >
                        {isTestingGemini ? "Testing..." : "Test"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-700">
                  <button
                    onClick={() => {
                      setCustomMapsKey("");
                      setCustomGeminiKey("");
                      apiUsageService.setCustomMapsKey("");
                      apiUsageService.setCustomGeminiKey("");
                      toast.info("Cleared custom keys. Reverted to default.", "Reset to Default");
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                  >
                    Clear Keys
                  </button>
                  <button
                    onClick={handleSaveCustomKeys}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Save API Keys
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: STEP-BY-STEP RETRIEVAL GUIDE */}
            {activeTab === "guide" && (
              <div className="space-y-6 text-xs text-surface-700 dark:text-surface-300">
                {/* Gemini Guide */}
                <div className="bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-purple-900 dark:text-purple-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      1. How to Get a Free Google Gemini API Key (1 Minute)
                    </h3>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Open AI Studio <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-surface-600 dark:text-surface-300 pl-1">
                    <li>
                      Visit{" "}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                      >
                        Google AI Studio (aistudio.google.com)
                      </a>{" "}
                      and sign in with your Google account.
                    </li>
                    <li>
                      Click the blue <span className="font-bold text-surface-900 dark:text-white">"Create API Key"</span> button.
                    </li>
                    <li>
                      Select <span className="italic">"Create key in new project"</span> and copy your generated API key.
                    </li>
                    <li>
                      Paste the key into the <span className="font-bold">BYOK</span> tab above and click <span className="font-bold">Save API Keys</span>.
                    </li>
                  </ol>
                  <p className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                    ✨ Free Tier includes <strong>1,500 requests per day</strong> at zero cost.
                  </p>
                </div>

                {/* Google Maps Guide */}
                <div className="bg-primary-50/60 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-900/40 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-primary-900 dark:text-primary-300 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary-500" />
                      2. How to Get a Free Google Maps API Key
                    </h3>
                    <a
                      href="https://console.cloud.google.com/google/maps-apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      Cloud Console <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-surface-600 dark:text-surface-300 pl-1">
                    <li>
                      Go to the{" "}
                      <a
                        href="https://console.cloud.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                      >
                        Google Cloud Console
                      </a>{" "}
                      and create or select a project.
                    </li>
                    <li>
                      Navigate to <span className="font-bold text-surface-900 dark:text-white">APIs & Services &gt; Library</span>, then search for and enable:
                      <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5 font-medium">
                        <li><strong>Places API (New)</strong></li>
                        <li><strong>Routes API</strong></li>
                      </ul>
                    </li>
                    <li>
                      Go to <span className="font-bold text-surface-900 dark:text-white">APIs & Services &gt; Credentials</span>, click <span className="font-bold">Create Credentials &gt; API Key</span>.
                    </li>
                    <li>
                      Copy your key and paste it into the <span className="font-bold">BYOK</span> tab above.
                    </li>
                  </ol>
                  <p className="text-[11px] text-primary-700 dark:text-primary-300 font-medium">
                    💳 Google Cloud provides a recurring <strong>$200 monthly free credit</strong> (~10,000 requests/month) for Maps APIs.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
