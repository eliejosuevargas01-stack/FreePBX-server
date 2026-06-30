import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // API Route for Gemini VoIP / Asterisk assistant
  app.post("/api/assistant", async (req, res) => {
    try {
      const { prompt, context } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "A chave de API do Gemini não está configurada. Configure o segredo GEMINI_API_KEY no painel do AI Studio."
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `Você é um Engenheiro de Telecomunicações sênior e especialista em Asterisk, FreePBX, Issabel e protocolos SIP/VoIP.
Você está interagindo com o usuário dentro de um simulador visual e gerador de configurações de Asterisk.
Aqui está o contexto atual do que o usuário configurou no simulador para ajudá-lo de forma extremamente direcionada:
- Ramais SIP configurados: ${JSON.stringify(context?.extensions || [])}
- Troncos VoIP (Provedores) configurados: ${JSON.stringify(context?.trunks || [])}
- Planos de discagem (dialplans) criados: ${JSON.stringify(context?.dialplans || [])}

Siga estas diretrizes estritas:
1. Responda em Português do Brasil de forma prestativa, altamente técnica mas com explicações claras.
2. Forneça exemplos práticos de arquivos sip.conf, pjsip.conf ou extensions.conf quando solicitados.
3. Se o usuário perguntar sobre instalação física de Asterisk, explique detalhadamente como instalar no Ubuntu 22.04/24.04 LTS (comandos apt, etc.) ou via Docker, e como abrir as portas UDP 5060 e portas RTP (10000 a 20000).
4. Explique conceitos como NAT, Codecs (g729, ulaw, alaw, gsm), registros SIP (register string), entroncamentos SIP e segurança (fail2ban, regras de firewall) se fizer sentido na conversa.
5. Seja focado em resultados reais que o usuário possa copiar e usar no seu servidor de produção.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
        }
      });

      return res.json({ text: response.text });
    } catch (error: any) {
      console.error("Erro no assistente Gemini:", error);
      return res.status(500).json({ error: error?.message || "Ocorreu um erro ao processar sua solicitação no servidor." });
    }
  });

  // Serve static files and handle Vite middleware in Development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
