import React, { useState } from "react";
import { DialplanRule, SipExtension, SipTrunk } from "../types";
import { Plus, Trash2, Edit2, GitFork, HelpCircle, Layers, Lightbulb, Check, Compass } from "lucide-react";

interface DialplanBuilderProps {
  dialplans: DialplanRule[];
  extensions: SipExtension[];
  trunks: SipTrunk[];
  onAddRule: (rule: DialplanRule) => void;
  onUpdateRule: (rule: DialplanRule) => void;
  onDeleteRule: (id: string) => void;
}

const DEFAULT_RULES: DialplanRule[] = [
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
  },
  {
    id: "rule_3",
    pattern: "*100",
    name: "Consulta Caixa Postal (Voicemail)",
    targetType: "ivr",
    targetValue: "VoicemailMain",
    description: "Permite consultar a caixa postal de mensagens de voz discando *100.",
  }
];

export default function DialplanBuilder({
  dialplans,
  extensions,
  trunks,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
}: DialplanBuilderProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [pattern, setPattern] = useState("");
  const [name, setName] = useState("");
  const [targetType, setTargetType] = useState<"extension" | "trunk" | "ivr" | "hangup">("extension");
  const [targetValue, setTargetValue] = useState("");
  const [description, setDescription] = useState("");

  const applyPreset = (presetType: "ddd" | "local" | "inter") => {
    if (presetType === "ddd") {
      setPattern("_0XX[2-9]XXXXXXX");
      setName("Saída Fixos DDD");
      setTargetType("trunk");
      setTargetValue(trunks[0]?.id || "any");
      setDescription("Encaminha chamadas de DDD nacionais de 10 dígitos (DDD + Fixo) para o tronco VoIP.");
    } else if (presetType === "local") {
      setPattern("_9XXXXXXXX");
      setName("Saída Celular Local");
      setTargetType("trunk");
      setTargetValue(trunks[0]?.id || "any");
      setDescription("Chamadas de celular local (9 dígitos) discadas sem DDD.");
    } else {
      setPattern("_00XXXXXXXXX.");
      setName("Saída Internacional (DDI)");
      setTargetType("trunk");
      setTargetValue(trunks[0]?.id || "any");
      setDescription("Encaminha ligações DDI (Internacional) começando com duplo zero para o tronco VoIP.");
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setPattern("");
    setName("");
    setTargetType("extension");
    setTargetValue(extensions[0]?.id || "all");
    setDescription("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (rule: DialplanRule) => {
    setEditingId(rule.id);
    setPattern(rule.pattern);
    setName(rule.name);
    setTargetType(rule.targetType);
    setTargetValue(rule.targetValue);
    setDescription(rule.description);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pattern.trim() || !name.trim()) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const ruleData: DialplanRule = {
      id: editingId || "rule_" + Date.now(),
      pattern,
      name,
      targetType,
      targetValue: targetValue || "any",
      description,
    };

    if (editingId) {
      onUpdateRule(ruleData);
    } else {
      onAddRule(ruleData);
    }
    setIsFormOpen(false);
  };

  const loadDefaults = () => {
    DEFAULT_RULES.forEach((rule) => {
      if (!dialplans.find((d) => d.pattern === rule.pattern)) {
        onAddRule(rule);
      }
    });
  };

  return (
    <div className="space-y-6" id="dialplan-builder-section">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <GitFork className="w-5 h-5 text-indigo-600" />
            Planos de Discagem (Dialplan / Rotas)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Determine o fluxo das chamadas: defina padrões de números discados e para onde direcionar (outro ramal ou tronco externo).
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto shrink-0">
          {dialplans.length === 0 && (
            <button
              onClick={loadDefaults}
              className="px-4 py-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition duration-200"
            >
              Carregar Padrões
            </button>
          )}
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition duration-200 shadow-sm hover:shadow w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Nova Rota de Saída
          </button>
        </div>
      </div>

      {/* Guide Asterisk Pattern syntax */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-3">
          <div className="p-2 bg-slate-100 rounded-lg font-mono text-indigo-600 font-bold text-xs shrink-0">
            _
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Início</h4>
            <p className="text-xs text-slate-500 mt-1">Indica que o padrão discado contém expressões regulares de padrão Asterisk.</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-3">
          <div className="p-2 bg-slate-100 rounded-lg font-mono text-indigo-600 font-bold text-xs shrink-0">
            X
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wider">X (Dígito 0-9)</h4>
            <p className="text-xs text-slate-500 mt-1">Representa qualquer dígito numérico individual na faixa de 0 a 9.</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-3">
          <div className="p-2 bg-slate-100 rounded-lg font-mono text-indigo-600 font-bold text-xs shrink-0">
            Z | N
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Z (1-9) | N (2-9)</h4>
            <p className="text-xs text-slate-500 mt-1">Z representa dígitos de 1 a 9. N representa de 2 a 9 (evita 0 e 1 de início).</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-start gap-3">
          <div className="p-2 bg-slate-100 rounded-lg font-mono text-indigo-600 font-bold text-xs shrink-0">
            .
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wider">Ponto (Coringa)</h4>
            <p className="text-xs text-slate-500 mt-1">Representa um ou mais dígitos adicionais de qualquer valor subsequente.</p>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg animate-in fade-in slide-in-from-top-4 duration-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-lg">
                {editingId ? "Editar Rota do Dialplan" : "Criar Nova Rota no Dialplan"}
              </h3>
              {!editingId && (
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-slate-400 font-medium">Modelos Rápidos:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset("local")}
                    className="px-2 py-1 text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded text-slate-600 font-medium transition"
                  >
                    Celular Local
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("ddd")}
                    className="px-2 py-1 text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded text-slate-600 font-medium transition"
                  >
                    Fixo DDD
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("inter")}
                    className="px-2 py-1 text-xs bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded text-slate-600 font-medium transition"
                  >
                    Internacional (DDI)
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Nome da Rota / Descritivo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Rota de Celular Local, Ramais Internos"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Padrão de Discagem (Pattern)
                </label>
                <input
                  type="text"
                  required
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="Ex: _0[2-9]XXXXXXXX, 1XX"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-mono font-semibold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Escreva de acordo com as regras de sintaxe do Asterisk.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Ação / Direcionamento (Target)
                </label>
                <select
                  value={targetType}
                  onChange={(e) => {
                    const type = e.target.value as any;
                    setTargetType(type);
                    if (type === "extension") {
                      setTargetValue(extensions[0]?.id || "dynamic");
                    } else if (type === "trunk") {
                      setTargetValue(trunks[0]?.id || "first_available");
                    } else {
                      setTargetValue("VoicemailMain");
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 bg-white"
                >
                  <option value="extension">Discar para Ramais Internos (Dial Extension)</option>
                  <option value="trunk">Discar via Tronco VoIP (Dial Outbound Trunk)</option>
                  <option value="ivr">Executar Serviço Especial (URA/Voicemail)</option>
                  <option value="hangup">Desligar Chamada (Hangup)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Valor de Destino
                </label>
                {targetType === "extension" ? (
                  <select
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 bg-white"
                  >
                    <option value="dynamic">Dinâmico (Ligar para o ramal discado)</option>
                    {extensions.map((ext) => (
                      <option key={ext.id} value={ext.id}>
                        Fixo: Ramal {ext.number} ({ext.name})
                      </option>
                    ))}
                  </select>
                ) : targetType === "trunk" ? (
                  <select
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 bg-white"
                  >
                    <option value="first_available">Primeiro Tronco VoIP Disponível</option>
                    {trunks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.providerName} ({t.host})
                      </option>
                    ))}
                  </select>
                ) : targetType === "ivr" ? (
                  <input
                    type="text"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="Nome da aplicação (Ex: VoicemailMain ou IVR-Atendimento)"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
                  />
                ) : (
                  <input
                    type="text"
                    disabled
                    value="Hangup() - Terminar imediatamente"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Descrição da Regra
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explique brevemente para que serve essa rota..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition duration-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition duration-200 shadow-sm"
              >
                {editingId ? "Salvar Alterações" : "Adicionar Rota"}
              </button>
            </div>
          </form>
        </div>
      )}

      {dialplans.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center p-6">
          <Compass className="w-12 h-12 text-slate-300 mb-3 stroke-[1.5]" />
          <h3 className="font-semibold text-slate-700 text-base">Nenhuma rota de discagem definida</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-sm">
            Sem dialplan, o Asterisk não saberá o que fazer com as chamadas feitas de seus ramais.
          </p>
          <button
            onClick={loadDefaults}
            className="mt-4 px-4 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-medium text-sm rounded-xl transition"
          >
            Carregar Dialplan Padrão
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">Nome da Rota</th>
                  <th className="py-4 px-6">Padrão (Pattern)</th>
                  <th className="py-4 px-6">Destino / Ação</th>
                  <th className="py-4 px-6">Descrição</th>
                  <th className="py-4 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {dialplans.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/30 transition group">
                    <td className="py-4 px-6 font-semibold text-slate-700">
                      {rule.name}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded font-bold text-xs">
                        {rule.pattern}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-slate-700 font-medium">
                        {rule.targetType === "extension" ? (
                          <span className="text-indigo-700 bg-indigo-50/70 border border-indigo-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                            Dial (SIP/{rule.targetValue === "dynamic" ? "${EXTEN}" : rule.targetValue})
                          </span>
                        ) : rule.targetType === "trunk" ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                            Dial (SIP/{rule.targetValue === "first_available" ? "VoIP_Trunk" : trunks.find(t => t.id === rule.targetValue)?.providerName || "VoIP_Trunk"}/${"EXTEN"})
                          </span>
                        ) : rule.targetType === "ivr" ? (
                          <span className="text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                            App ({rule.targetValue})
                          </span>
                        ) : (
                          <span className="text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                            Hangup()
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-xs max-w-xs">
                      {rule.description}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-1 opacity-80 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleOpenEdit(rule)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition"
                          title="Editar Rota"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteRule(rule.id)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="Excluir Rota"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Code insight */}
      <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-3">
        <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
          <Lightbulb className="w-4 h-4" />
          Como as rotas se traduzem no arquivo extensions.conf?
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Para cada padrão acima, o simulador traduz as rotas em blocos de extensão do Asterisk no contexto selecionado. O padrão Asterisk ordena a execução por prioridade numérica (<code className="font-mono text-slate-200">exten =&gt; padrão,prioridade,ação</code>). Veja a tradução gerada para a primeira linha:
        </p>
        <pre className="bg-slate-950 p-3 rounded-lg text-xs font-mono text-indigo-300 overflow-x-auto border border-slate-800">
{`[from-internal]
exten => _1XX,1,NoOp(Chamada interna para Ramal)
exten => _1XX,2,Dial(SIP/\${EXTEN},30,rtT)
exten => _1XX,3,Hangup()`}
        </pre>
      </div>
    </div>
  );
}
