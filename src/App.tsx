/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { SipExtension, SipTrunk, DialplanRule } from "./types";
import ExtensionsManager from "./components/ExtensionsManager";
import TrunkManager from "./components/TrunkManager";
import DialplanBuilder from "./components/DialplanBuilder";
import CliSimulator from "./components/CliSimulator";
import AiAssistant from "./components/AiAssistant";
import { Server, PhoneCall, Link2, GitFork, Terminal, MessageSquare, AlertCircle, Sparkles, BookOpen, ChevronRight } from "lucide-react";

const INITIAL_EXTENSIONS: SipExtension[] = [
  {
    id: "101",
    number: "101",
    name: "Suporte Tecnico",
    secret: "sup@asterisk123",
    context: "from-internal",
    host: "dynamic",
    dtmfMode: "rfc2833",
    nat: "force_rport,comedia",
    allowCodecs: ["ulaw", "alaw"],
    status: "online",
  },
  {
    id: "102",
    number: "102",
    name: "Vendas",
    secret: "sales#pass987",
    context: "from-internal",
    host: "dynamic",
    dtmfMode: "rfc2833",
    nat: "force_rport,comedia",
    allowCodecs: ["ulaw", "g729"],
    status: "online",
  }
];

const INITIAL_TRUNKS: SipTrunk[] = [
  {
    id: "trunk_1",
    providerName: "DirectVoIP_Brasil",
    host: "sip.directvoip.com.br",
    username: "551140049999",
    secret: "voipSec_938102",
    context: "from-trunk",
    registerString: "551140049999:voipSec_938102@sip.directvoip.com.br/551140049999",
    fromUser: "551140049999",
    fromDomain: "sip.directvoip.com.br",
    nat: "yes",
    status: "registered",
  }
];

const INITIAL_DIALPLANS: DialplanRule[] = [
  {
    id: "rule_1",
    pattern: "1XX",
    name: "Chamadas Internas (Ramais)",
    targetType: "extension",
    targetValue: "dynamic",
    description: "Permite que qualquer ramal na faixa de 100 a 199 ligue diretamente para outro ramal.",
  },
  {
    id: "rule_2",
    pattern: "_0[2-9]XXXXXXXX",
    name: "Chamadas de Saída Celular/Fixo via VoIP",
    targetType: "trunk",
    targetValue: "first_available",
    description: "Encaminha chamadas externas iniciadas com 0 + DDD + Número para o tronco VoIP ativo.",
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "extensions" | "trunks" | "dialplan" | "cli" | "ai">("dashboard");
  const [extensions, setExtensions] = useState<SipExtension[]>(INITIAL_EXTENSIONS);
  const [trunks, setTrunks] = useState<SipTrunk[]>(INITIAL_TRUNKS);
  const [dialplans, setDialplans] = useState<DialplanRule[]>(INITIAL_DIALPLANS);

  // Handlers for extensions
  const handleAddExtension = (newExt: SipExtension) => {
    setExtensions((prev) => [...prev, newExt]);
  };
  const handleUpdateExtension = (updatedExt: SipExtension) => {
    setExtensions((prev) => prev.map((e) => (e.id === updatedExt.id ? updatedExt : e)));
  };
  const handleDeleteExtension = (id: string) => {
    setExtensions((prev) => prev.filter((e) => e.id !== id));
  };

  // Handlers for trunks
  const handleAddTrunk = (newTrunk: SipTrunk) => {
    setTrunks((prev) => [...prev, newTrunk]);
  };
  const handleUpdateTrunk = (updatedTrunk: SipTrunk) => {
    setTrunks((prev) => prev.map((t) => (t.id === updatedTrunk.id ? updatedTrunk : t)));
  };
  const handleDeleteTrunk = (id: string) => {
    setTrunks((prev) => prev.filter((t) => t.id !== id));
  };

  // Handlers for dialplans
  const handleAddDialplan = (newRule: DialplanRule) => {
    setDialplans((prev) => [...prev, newRule]);
  };
  const handleUpdateDialplan = (updatedRule: DialplanRule) => {
    setDialplans((prev) => prev.map((d) => (d.id === updatedRule.id ? updatedRule : d)));
  };
  const handleDeleteDialplan = (id: string) => {
    setDialplans((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="full-pbx-server-simulator">
      {/* Top Brand Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <Server className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight">Asterisk & FreePBX</h1>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Real VPS Server Creator
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Configure ramais, operadoras VoIP e instale o Asterisk real em sua VPS Linux</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 text-xs font-mono text-slate-400 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/40">
            <div>
              Status do SIP: <span className="text-emerald-400 font-bold">● ONLINE</span>
            </div>
            <div className="text-slate-600">|</div>
            <div>
              Porta SIP: <span className="text-indigo-400">5060 UDP</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="lg:w-64 shrink-0 space-y-2">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Navegação Central</span>
            <nav className="space-y-1.5">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition duration-150 ${
                  activeTab === "dashboard"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100/75 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Server className="w-4 h-4 shrink-0" />
                  Painel de Controle
                </span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => setActiveTab("extensions")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition duration-150 ${
                  activeTab === "extensions"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100/75 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <PhoneCall className="w-4 h-4 shrink-0" />
                  Ramais SIP ({extensions.length})
                </span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => setActiveTab("trunks")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition duration-150 ${
                  activeTab === "trunks"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100/75 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Link2 className="w-4 h-4 shrink-0" />
                  Troncos VoIP ({trunks.length})
                </span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => setActiveTab("dialplan")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition duration-150 ${
                  activeTab === "dialplan"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100/75 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <GitFork className="w-4 h-4 shrink-0" />
                  Planos de Discagem ({dialplans.length})
                </span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => setActiveTab("cli")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition duration-150 ${
                  activeTab === "cli"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100/75 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-2.5 font-bold">
                  <Terminal className="w-4 h-4 shrink-0 text-emerald-500" />
                  🚀 Gerador de VPS & Configs
                </span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              </button>

              <button
                onClick={() => setActiveTab("ai")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition duration-150 ${
                  activeTab === "ai"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100/75 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-2.5 text-indigo-600 font-bold hover:text-indigo-700">
                  <Sparkles className="w-4 h-4 shrink-0 fill-indigo-100" />
                  Engenheiro de VoIP AI
                </span>
                <ChevronRight className="w-3.5 h-3.5 opacity-60 text-indigo-600" />
              </button>
            </nav>
          </div>

          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm space-y-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Servidor de Produção</span>
            <div className="space-y-3 text-xs leading-relaxed">
              <p className="text-slate-300">
                Esta ferramenta gera um instalador Linux automatizado (Bash Script) customizado com seus ramais e troncos. Execute-o diretamente em sua VPS para ter um servidor Asterisk real ativo!
              </p>
              <div className="p-2.5 bg-slate-800 rounded-lg border border-slate-700/50 space-y-1.5 font-mono text-[10px] text-slate-300">
                <div className="text-indigo-400 font-semibold">Diretórios Gerados:</div>
                <div>/etc/asterisk/pjsip.conf</div>
                <div>/etc/asterisk/extensions.conf</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Dynamic Panel Content */}
        <main className="flex-1 space-y-6">
          {activeTab === "dashboard" && (
            <div className="space-y-6" id="dashboard-main-view">
              {/* Header hero */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-md relative overflow-hidden border border-slate-800">
                <div className="relative z-10 space-y-3 max-w-2xl">
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                    Provedor de Servidor VPS Real
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                    Crie e instale sua central VoIP real em qualquer VPS (AWS, DigitalOcean, Oracle)
                  </h2>
                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                    Configure seus ramais e as credenciais de sua operadora VoIP de saída. Nossa plataforma gerará um Script Bash completo de auto-instalação para você rodar na sua VPS com apenas um comando!
                  </p>
                </div>
              </div>

              {/* Status bento-grid stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Ramais Cadastrados</span>
                    <span className="text-2xl font-black text-slate-800 block mt-0.5">{extensions.length}</span>
                    <span className="text-[10px] text-emerald-600 font-medium mt-1 block">
                      {extensions.filter((e) => e.status === "online").length} ativos no simulador
                    </span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Troncos VoIP (Carriers)</span>
                    <span className="text-2xl font-black text-slate-800 block mt-0.5">{trunks.length}</span>
                    <span className="text-[10px] text-emerald-600 font-medium mt-1 block">
                      {trunks.filter((t) => t.status === "registered").length} operadoras registradas
                    </span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                    <GitFork className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Rotas de Discagem Ativas</span>
                    <span className="text-2xl font-black text-slate-800 block mt-0.5">{dialplans.length}</span>
                    <span className="text-[10px] text-slate-400 font-medium mt-1 block">Sintaxe extensions.conf padrão</span>
                  </div>
                </div>
              </div>

              {/* Steps Guide visual */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  Passo a Passo Recomendado para Configurar sua Central VoIP
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  <div className="space-y-2 p-4 bg-slate-50 rounded-xl relative">
                    <span className="absolute right-4 top-4 text-3xl font-black text-indigo-100 leading-none">01</span>
                    <h4 className="font-bold text-slate-800 text-sm">Criar Ramais SIP</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Vá em <span className="font-semibold text-indigo-600">Ramais SIP</span> e crie as extensões numéricas dos seus atendentes (ex: 101, 102). Defina uma senha forte.
                    </p>
                  </div>

                  <div className="space-y-2 p-4 bg-slate-50 rounded-xl relative">
                    <span className="absolute right-4 top-4 text-3xl font-black text-indigo-100 leading-none">02</span>
                    <h4 className="font-bold text-slate-800 text-sm">Cadastrar Provedor VoIP</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Adicione os dados da operadora de saída em <span className="font-semibold text-indigo-600">Troncos VoIP</span> para poder enviar ligações para o mundo externo.
                    </p>
                  </div>

                  <div className="space-y-2 p-4 bg-slate-50 rounded-xl relative">
                    <span className="absolute right-4 top-4 text-3xl font-black text-indigo-100 leading-none">03</span>
                    <h4 className="font-bold text-slate-800 text-sm">Configurar Dialplan</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Crie rotas definindo regras que direcionam números discados para os ramais ou para a operadora VoIP externa usando padrão Asterisk.
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex justify-center">
                  <button
                    onClick={() => setActiveTab("cli")}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition shadow hover:shadow-md"
                  >
                    Ir para Gerador de Script VPS & Instalação
                    <ChevronRight className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              </div>

              {/* Informative tips */}
              <div className="bg-indigo-50 border border-indigo-100/60 p-4 rounded-xl flex gap-3 text-indigo-900">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-indigo-600" />
                <div className="text-xs space-y-1">
                  <p className="font-bold">Diferença técnica entre Asterisk e FreePBX:</p>
                  <p>
                    O **Asterisk** é a engine pura de telefonia (Open Source), onde tudo é configurado por meio de arquivos de texto como `sip.conf` e `extensions.conf`. O **FreePBX** ou **Issabel** é uma interface web visual (built on top) que gerencia esses mesmos arquivos de texto por você. Ao configurar este simulador, você está gerando exatamente os códigos limpos que rodam por trás de qualquer FreePBX!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "extensions" && (
            <ExtensionsManager
              extensions={extensions}
              onAddExtension={handleAddExtension}
              onUpdateExtension={handleUpdateExtension}
              onDeleteExtension={handleDeleteExtension}
            />
          )}

          {activeTab === "trunks" && (
            <TrunkManager
              trunks={trunks}
              onAddTrunk={handleAddTrunk}
              onUpdateTrunk={handleUpdateTrunk}
              onDeleteTrunk={handleDeleteTrunk}
            />
          )}

          {activeTab === "dialplan" && (
            <DialplanBuilder
              dialplans={dialplans}
              extensions={extensions}
              trunks={trunks}
              onAddRule={handleAddDialplan}
              onUpdateRule={handleUpdateDialplan}
              onDeleteRule={handleDeleteDialplan}
            />
          )}

          {activeTab === "cli" && (
            <CliSimulator
              extensions={extensions}
              trunks={trunks}
              dialplans={dialplans}
            />
          )}

          {activeTab === "ai" && (
            <AiAssistant
              extensions={extensions}
              trunks={trunks}
              dialplans={dialplans}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-500 text-xs py-6 border-t border-slate-900 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            &copy; 2026 Asterisk & FreePBX PBX VoIP Server Creator. Licença Apache 2.0.
          </div>
          <div className="flex gap-4">
            <button onClick={() => setActiveTab("dashboard")} className="hover:text-white transition">Painel</button>
            <span>&middot;</span>
            <button onClick={() => setActiveTab("cli")} className="hover:text-white transition">Configurações Prontas</button>
            <span>&middot;</span>
            <button onClick={() => setActiveTab("ai")} className="hover:text-white transition">Suporte Engenharia AI</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
