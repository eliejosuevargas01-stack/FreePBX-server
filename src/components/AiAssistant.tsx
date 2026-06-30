import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Sparkles, User, Terminal, Check, Bot, AlertTriangle } from "lucide-react";
import { SipExtension, SipTrunk, DialplanRule } from "../types";

interface AiAssistantProps {
  extensions: SipExtension[];
  trunks: SipTrunk[];
  dialplans: DialplanRule[];
}

export default function AiAssistant({ extensions, trunks, dialplans }: AiAssistantProps) {
  const [messages, setMessages] = useState<{ sender: "user" | "assistant"; text: string }[]>([
    {
      sender: "assistant",
      text: "Olá! Sou seu assistente de engenharia de telecomunicações Asterisk e FreePBX. Posso te ajudar a projetar troncos VoIP reais, sugerir configurações avançadas para o `sip.conf` / `pjsip.conf`, auxiliar na instalação física no Linux ou tirar qualquer dúvida técnica sobre telefonia IP e NAT.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput("");
    setErrorMsg("");
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: userText,
          context: {
            extensions,
            trunks,
            dialplans,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Erro de conexão com o servidor de IA. Por favor, verifique se seu servidor Node está ativo.");
      }

      const data = await response.json();
      if (data.error) {
        setErrorMsg(data.error);
        setMessages((prev) => [
          ...prev,
          {
            sender: "assistant",
            text: "Ocorreu um erro ao obter resposta do Gemini: " + data.error,
          },
        ]);
      } else {
        setMessages((prev) => [...prev, { sender: "assistant", text: data.text }]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro de rede ao conectar com o backend.");
      setMessages((prev) => [
        ...prev,
        {
          sender: "assistant",
          text: "Falha técnica ao se comunicar com o servidor do assistente AI. Certifique-se de configurar a variável de ambiente GEMINI_API_KEY no painel de segredos do AI Studio.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const setPresetQuestion = (q: string) => {
    setInput(q);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[550px]" id="voip-ai-assistant">
      <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Sparkles className="w-5 h-5 fill-indigo-100" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Assistente de Configuração Asterisk & VoIP</h3>
            <p className="text-xs text-slate-500 mt-0.5">Tire dúvidas, peça exemplos de código ou guias de instalação.</p>
          </div>
        </div>
      </div>

      {/* Messages layout */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-3 max-w-[85%] ${m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              m.sender === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
            }`}>
              {m.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
              m.sender === "user"
                ? "bg-indigo-600 text-white rounded-tr-none shadow-sm"
                : "bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none"
            }`}>
              <div className="whitespace-pre-line prose prose-sm prose-slate max-w-none">
                {m.text}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              <span className="text-xs text-slate-500 ml-1">Analisando infraestrutura...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {errorMsg && (
        <div className="mx-5 mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Erro no Servidor:</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Preset questions quick chips */}
      <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setPresetQuestion("Como configurar NAT e portas RTP no Asterisk para evitar áudio unidirecional?")}
          className="text-xs font-semibold bg-white text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-100 px-3 py-1.5 rounded-lg whitespace-nowrap transition"
        >
          Resolver Áudio Unidirecional (NAT)
        </button>
        <button
          onClick={() => setPresetQuestion("Como posso integrar este plano de discagem gerado com uma URA (Menu de Voz)?")}
          className="text-xs font-semibold bg-white text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-100 px-3 py-1.5 rounded-lg whitespace-nowrap transition"
        >
          Criar URA de Voz
        </button>
        <button
          onClick={() => setPresetQuestion("Quais as diferenças práticas entre o antigo SIP (chan_sip) e o novo PJSIP no Asterisk?")}
          className="text-xs font-semibold bg-white text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-100 px-3 py-1.5 rounded-lg whitespace-nowrap transition"
        >
          Diferenças SIP vs PJSIP
        </button>
      </div>

      {/* Input controls form */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-100 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Faça uma pergunta sobre telecomunicações, Asterisk ou FreePBX..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 text-sm"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold rounded-xl transition duration-150 shadow-sm flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
