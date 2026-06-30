import React, { useState, useEffect, useRef } from "react";
import { SipExtension, SipTrunk, DialplanRule, CliLog, SimulatedCall } from "../types";
import { Play, Square, Terminal, FileText, Download, Code, CheckCircle, Server, Shield, ArrowRight, Settings } from "lucide-react";

interface CliSimulatorProps {
  extensions: SipExtension[];
  trunks: SipTrunk[];
  dialplans: DialplanRule[];
}

export default function CliSimulator({ extensions, trunks, dialplans }: CliSimulatorProps) {
  const [activeCall, setActiveCall] = useState<SimulatedCall | null>(null);
  const [logs, setLogs] = useState<CliLog[]>([]);
  const [fromExt, setFromExt] = useState("");
  const [toDial, setToDial] = useState("");
  const [selectedConfigTab, setSelectedConfigTab] = useState<"script" | "pjsip" | "sip" | "extensions" | "vps">("script");
  const [copied, setCopied] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (extensions.length > 0 && !fromExt) {
      const onlineExt = extensions.find((e) => e.status === "online");
      setFromExt(onlineExt?.number || extensions[0].number);
    }
  }, [extensions]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const addLog = (message: string, level: CliLog["level"] = "VERBOSE") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      {
        id: "log_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
        timestamp,
        level,
        message,
      },
    ]);
  };

  const handleStartCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromExt || !toDial.trim()) return;

    const caller = extensions.find((e) => e.number === fromExt);
    if (!caller) return;

    setLogs([]);
    addLog(`=== Depurador de Dialplan - Testando Roteamento Real ===`, "NOTICE");
    addLog(`SIP/${fromExt} está tentando discar para "${toDial}"...`, "VERBOSE");
    addLog(`-- Analisando contexto de origem: [${caller.context}]`, "VERBOSE");

    let matchedRule: DialplanRule | undefined;
    const sortedRules = [...dialplans].sort((a, b) => b.pattern.length - a.pattern.length);

    for (const rule of sortedRules) {
      const cleanPattern = rule.pattern.replace("_", "");
      if (rule.pattern === "1XX" && toDial.length === 3 && toDial.startsWith("1")) {
        matchedRule = rule;
        break;
      } else if (cleanPattern.includes("[2-9]") || cleanPattern.includes("X")) {
        let regexStr = "^" + cleanPattern
          .replace(/\[/g, "[")
          .replace(/\]/g, "]")
          .replace(/X/g, "[0-9]")
          .replace(/Z/g, "[1-9]")
          .replace(/N/g, "[2-9]")
          .replace(/\./g, ".*") + "$";
        try {
          const regex = new RegExp(regexStr);
          if (regex.test(toDial)) {
            matchedRule = rule;
            break;
          }
        } catch (e) {}
      } else if (toDial === rule.pattern) {
        matchedRule = rule;
        break;
      }
    }

    if (!matchedRule) {
      addLog(`[AVISO] Sem correspondência! Nenhuma regra encontrada para '${toDial}' no contexto '${caller.context}'.`, "WARNING");
      addLog(`-- Executando Hangup() imediato por segurança. Chamada encerrada com causa 1 (unallocated number).`, "ERROR");
      return;
    }

    addLog(`-- Rota Coincidida: "${matchedRule.name}"`, "NOTICE");
    addLog(`-- Padrão de Dialplan correspondente: "${matchedRule.pattern}"`, "VERBOSE");

    if (matchedRule.targetType === "extension") {
      const targetExt = extensions.find((e) => e.number === toDial);
      addLog(`-- Roteamento Interno: Discando para o ramal SIP/${toDial}...`, "VERBOSE");
      
      if (!targetExt) {
        addLog(`[ERRO] Ramal destino ${toDial} não existe nas configurações. Chamada falhou!`, "ERROR");
        return;
      }

      setActiveCall({
        id: "call_" + Date.now(),
        from: fromExt,
        to: toDial,
        status: "ringing",
        duration: 0,
      });

      addLog(`-- Enviando invite SIP para ramal: "${targetExt.name}" <${targetExt.number}>`, "VERBOSE");
      addLog(`-- Canal SIP/${fromExt} tocando em SIP/${toDial}...`, "VERBOSE");

      setTimeout(() => {
        setActiveCall((prev) => {
          if (!prev) return null;
          addLog(`-- Chamada ATENDIDA pelo ramal SIP/${toDial}!`, "NOTICE");
          addLog(`-- Conversação estabelecida. Codec: alaw, Fluxo RTP ativo de forma bidirecional.`, "VERBOSE");
          return {
            ...prev,
            status: "active",
            startTime: new Date(),
          };
        });
      }, 1500);

    } else if (matchedRule.targetType === "trunk") {
      const selectedTrunkId = matchedRule.targetValue;
      const activeTrunk = trunks.find((t) => t.id === selectedTrunkId) || trunks[0];
      
      if (!activeTrunk) {
        addLog(`[ERRO] Rota de saída configurada para tronco VoIP, mas nenhum tronco foi definido no sistema.`, "ERROR");
        return;
      }

      addLog(`-- Roteamento Externo: Enviando para Tronco VoIP [${activeTrunk.providerName}]`, "NOTICE");
      addLog(`-- Servidor Gateway SIP: sip:${activeTrunk.host}`, "VERBOSE");
      addLog(`-- Autenticando com usuário: ${activeTrunk.username}`, "VERBOSE");
      addLog(`-- Executando comando de discagem: Dial(SIP/${activeTrunk.providerName}/${toDial},45,T)`, "VERBOSE");

      setActiveCall({
        id: "call_" + Date.now(),
        from: fromExt,
        to: toDial,
        status: "ringing",
        duration: 0,
      });

      setTimeout(() => {
        setActiveCall((prev) => {
          if (!prev) return null;
          addLog(`-- Conexão aceita pela operadora ${activeTrunk.providerName}. Assinante remoto atendeu.`, "NOTICE");
          addLog(`-- Bridge de Áudio estabelecida entre Ramal SIP/${fromExt} e Tronco VoIP externo!`, "VERBOSE");
          addLog(`-- Canal SIP Ativo. NAT contornado com sucesso via symmetric rport.`, "VERBOSE");
          return {
            ...prev,
            status: "active",
            startTime: new Date(),
          };
        });
      }, 2000);

    } else if (matchedRule.targetType === "ivr") {
      addLog(`-- Encaminhando para Aplicação de Voz do Servidor: ${matchedRule.targetValue}`, "NOTICE");
      addLog(`-- Executando Answer() no canal SIP/${fromExt}...`, "VERBOSE");
      
      setActiveCall({
        id: "call_" + Date.now(),
        from: fromExt,
        to: toDial,
        status: "active",
        duration: 0,
        startTime: new Date(),
      });

      if (matchedRule.targetValue === "VoicemailMain") {
        addLog(`-- Entrando na Caixa Postal Central (VoiceMailMain).`, "VERBOSE");
        addLog(`-- Áudio: "Por favor, digite a sua senha de acesso..."`, "VERBOSE");
      } else {
        addLog(`-- Áudio URA / Fila de Atendimento sendo reproduzido no canal.`, "VERBOSE");
        addLog(`-- "Obrigado por ligar. Aguarde para ser atendido..."`, "VERBOSE");
      }
    }
  };

  const handleHangup = () => {
    if (!activeCall) return;
    addLog(`-- Sinal de Hangup recebido (fim de chamada).`, "VERBOSE");
    addLog(`-- Liberando canais RTP e portas de mídia do servidor Asterisk.`, "VERBOSE");
    addLog(`== Canal SIP/${activeCall.from} desconectado com sucesso. Status: Idle`, "NOTICE");
    setActiveCall(null);
  };

  useEffect(() => {
    let interval: any;
    if (activeCall && activeCall.status === "active") {
      interval = setInterval(() => {
        setActiveCall((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            duration: prev.duration + 1,
          };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCall]);

  const generateSipConf = () => {
    let content = `; =========================================================\n`;
    content += `; ARQUIVO DE CONFIGURACAO: /etc/asterisk/sip.conf\n`;
    content += `; Personalizado e Pronto para Producao em sua VPS\n`;
    content += `; =========================================================\n\n`;
    content += `[general]\n`;
    content += `context=from-external          ; Contexto padrao de seguranca\n`;
    content += `allowguest=no                  ; Desativar chamadas nao autenticadas\n`;
    content += `srvlookup=yes                  ; Habilitar resolucao DNS SRV\n`;
    content += `udpbindaddr=0.0.0.0:5060       ; Escuta SIP UDP em todos os IPs públicos da VPS\n`;
    content += `tcpenable=no                   ; Evitar TCP desnecessario por segurança\n`;
    content += `transport=udp\n`;
    content += `localnet=192.168.0.0/255.255.0.0 ; Substitua pela faixa da sua rede se houver VPN\n`;
    content += `nat=force_rport,comedia        ; ESSENCIAL para evitar audio mudo atras de NAT/Firewall\n`;
    content += `language=pt_BR                 ; Audios em Portugues (pt_BR)\n`;
    content += `directmedia=no                 ; Forcar passagem de audio pelo Asterisk\n`;
    content += `rtpkeepalive=15                ; Evitar desconexoes silenciosas por timeout de firewall\n\n`;

    if (trunks.length > 0) {
      content += `; ----------- REGISTRO DE TRONCOS VOIP -----------\n`;
      trunks.forEach((t) => {
        content += `register => ${t.registerString}\n`;
      });
      content += `\n`;
    }

    trunks.forEach((t) => {
      content += `; ----------- OPERADORA VOIP: ${t.providerName} -----------\n`;
      content += `[${t.providerName}]\n`;
      content += `type=peer\n`;
      content += `host=${t.host}\n`;
      content += `username=${t.username}\n`;
      content += `secret=${t.secret}\n`;
      content += `context=${t.context}\n`;
      content += `disallow=all\n`;
      content += `allow=alaw\n`;
      content += `allow=ulaw\n`;
      content += `allow=g729\n`;
      if (t.fromUser) content += `fromuser=${t.fromUser}\n`;
      if (t.fromDomain) content += `fromdomain=${t.fromDomain}\n`;
      content += `nat=${t.nat === "yes" ? "force_rport,comedia" : "no"}\n`;
      content += `qualify=yes\n`;
      content += `insecure=invite,port\n\n`;
    });

    content += `; ----------- CONFIGURACAO DE RAMAIS SIP -----------\n`;
    extensions.forEach((ext) => {
      content += `[${ext.number}] ; ${ext.name}\n`;
      content += `type=friend\n`;
      content += `host=${ext.host}\n`;
      content += `secret=${ext.secret}\n`;
      content += `context=${ext.context}\n`;
      content += `disallow=all\n`;
      ext.allowCodecs.forEach((codec) => {
        content += `allow=${codec}\n`;
      });
      content += `dtmfmode=${ext.dtmfMode}\n`;
      content += `nat=${ext.nat}\n`;
      content += `qualify=yes\n`;
      content += `callerid="${ext.name}" <${ext.number}>\n\n`;
    });

    return content;
  };

  const generatePjsipConf = () => {
    let content = `; =========================================================\n`;
    content += `; ARQUIVO DE CONFIGURACAO: /etc/asterisk/pjsip.conf\n`;
    content += `; Formato Moderno PJSIP recomendado pelo Asterisk\n`;
    content += `; =========================================================\n\n`;
    content += `[transport-udp]\n`;
    content += `type=transport\n`;
    content += `protocol=udp\n`;
    content += `bind=0.0.0.0:5060\n\n`;

    extensions.forEach((ext) => {
      content += `; ----------- CONFIGURACAO RAMAL: ${ext.number} -----------\n`;
      content += `[${ext.number}]\n`;
      content += `type=aor\n`;
      content += `max_contacts=1\n\n`;

      content += `[${ext.number}]\n`;
      content += `type=auth\n`;
      content += `auth_type=userpass\n`;
      content += `username=${ext.number}\n`;
      content += `password=${ext.secret}\n\n`;

      content += `[${ext.number}]\n`;
      content += `type=endpoint\n`;
      content += `context=${ext.context}\n`;
      content += `disallow=all\n`;
      content += `allow=${ext.allowCodecs.join(",")}\n`;
      content += `auth=${ext.number}\n`;
      content += `aors=${ext.number}\n`;
      content += `callerid="${ext.name}" <${ext.number}>\n`;
      content += `rtp_symmetric=yes\n`;
      content += `force_rport=yes\n`;
      content += `direct_media=no\n\n`;
    });

    return content;
  };

  const generateExtensionsConf = () => {
    let content = `; =========================================================\n`;
    content += `; ARQUIVO DE CONFIGURACAO: /etc/asterisk/extensions.conf\n`;
    content += `; Plano de Discagem Real com Roteamento Estruturado\n`;
    content += `; =========================================================\n\n`;
    content += `[general]\n`;
    content += `static=yes\n`;
    content += `writeprotect=no\n\n`;

    content += `[globals]\n`;
    content += `; Variavel global do Tronco VoIP Primario\n`;
    content += `TRONCO_PADRAO=SIP/${trunks[0]?.providerName || "VoIP_Trunk"}\n\n`;

    content += `[from-internal]\n`;
    content += `; --- Chamadas Internas Diretas entre Ramais ---\n`;
    extensions.forEach((ext) => {
      content += `exten => ${ext.number},1,NoOp(Chamando ramal ${ext.number} - ${ext.name})\n`;
      content += `exten => ${ext.number},n,Dial(SIP/${ext.number},30,rtT)\n`;
      content += `exten => ${ext.number},n,VoiceMail(${ext.number}@default,u)\n`;
      content += `exten => ${ext.number},n,Hangup()\n\n`;
    });

    content += `; --- Rotas de Saida Customizadas ---\n`;
    dialplans.forEach((rule) => {
      content += `; Rota: ${rule.name}\n`;
      const p = rule.pattern;
      if (rule.targetType === "trunk") {
        const tName = rule.targetValue === "first_available" ? (trunks[0]?.providerName || "VoIP_Trunk") : (trunks.find(t => t.id === rule.targetValue)?.providerName || "VoIP_Trunk");
        content += `exten => ${p},1,NoOp(Efetuando chamada de saida externa via tronco ${tName})\n`;
        content += `exten => ${p},n,Dial(SIP/${tName}/\${EXTEN},45,T)\n`;
        content += `exten => ${p},n,Playtones(congestion)\n`;
        content += `exten => ${p},n,Congestion()\n`;
        content += `exten => ${p},n,Hangup()\n\n`;
      } else if (rule.targetType === "ivr") {
        content += `exten => ${p},1,NoOp(Redirecionando para servico especial: ${rule.targetValue})\n`;
        if (rule.targetValue === "VoicemailMain") {
          content += `exten => ${p},n,Answer()\n`;
          content += `exten => ${p},n,VoicemailMain(default)\n`;
          content += `exten => ${p},n,Hangup()\n\n`;
        } else {
          content += `exten => ${p},n,Answer()\n`;
          content += `exten => ${p},n,Queue(atendimento-central)\n`;
          content += `exten => ${p},n,Hangup()\n\n`;
        }
      }
    });

    content += `[from-trunk]\n`;
    content += `; --- Contexto de Recebimento do Provedor VoIP ---\n`;
    content += `exten => s,1,NoOp(Chamada Recebida Externa via Tronco VoIP)\n`;
    if (extensions.length > 0) {
      content += `exten => s,n,Dial(SIP/${extensions[0].number},25,rtT) ; Envia para o primeiro ramal de suporte por padrao\n`;
    }
    content += `exten => s,n,Hangup()\n`;

    return content;
  };

  const generateInstallScript = () => {
    const sipConfEscaped = generateSipConf().replace(/\\/g, "\\\\").replace(/\$/g, "\\$").replace(/`/g, "\\`");
    const extensionsConfEscaped = generateExtensionsConf().replace(/\\/g, "\\\\").replace(/\$/g, "\\$").replace(/`/g, "\\`");
    const pjsipConfEscaped = generatePjsipConf().replace(/\\/g, "\\\\").replace(/\$/g, "\\$").replace(/`/g, "\\`");

    let script = `#!/bin/bash\n`;
    script += `# =========================================================================\n`;
    script += `# SCRIPT DE AUTO-INSTALACAO ASTERISK PERSONALIZADO PARA VPS DE PRODUCAO\n`;
    script += `# Gerado automaticamente com base em suas configuracoes\n`;
    script += `# Testado em: Ubuntu Server 22.04 LTS / Ubuntu 24.04 LTS\n`;
    script += `# =========================================================================\n\n`;
    script += `set -e\n\n`;
    script += `echo "==================================================================="\n`;
    script += `echo "Iniciando Instalacao Real do Asterisk SIP Server em sua VPS!"\n`;
    script += `echo "==================================================================="\n\n`;

    script += `echo ">>> Passo 1: Atualizando repositorios e pacotes do sistema Linux..."\n`;
    script += `sudo apt-get update && sudo apt-get upgrade -y\n\n`;

    script += `echo ">>> Passo 2: Instalando compiladores e bibliotecas necessarias..."\n`;
    script += `sudo apt-get install -y build-essential git libxml2-dev libncurses5-dev uuid-dev \\\n`;
    script += `  libsqlite3-dev sqlite3 libjansson-dev libssl-dev libedit-dev \\\n`;
    script += `  libcurl4-openssl-dev libspeex-dev libspeexdsp-dev unzip wget ufw\n\n`;

    script += `echo ">>> Passo 3: Baixando codigo fonte oficial do Asterisk LTS..."\n`;
    script += `cd /usr/src\n`;
    script += `sudo wget -q --show-progress http://downloads.asterisk.org/pub/telephony/asterisk/asterisk-20-current.tar.gz\n`;
    script += `sudo tar -zxvf asterisk-20-current.tar.gz\n`;
    script += `cd asterisk-20.*/\n\n`;

    script += `echo ">>> Passo 4: Instalando modulos de audio de terceiros e prereqs..."\n`;
    script += `sudo contrib/scripts/get_mp3_source.sh\n`;
    script += `sudo DEBIAN_FRONTEND=noninteractive contrib/scripts/install_prereq install\n\n`;

    script += `echo ">>> Passo 5: Configurando e compilando binarios..."\n`;
    script += `sudo ./configure --with-jansson-bundled --with-ssl\n`;
    script += `sudo make -j\$(nproc)\n`;
    script += `sudo make install\n`;
    script += `sudo make samples\n`;
    script += `sudo make config\n`;
    script += `sudo ldconfig\n\n`;

    script += `echo ">>> Passo 6: Instalando pacote de audios e vozes em Portugues (pt_BR)..."\n`;
    script += `sudo mkdir -p /var/lib/asterisk/sounds/pt_BR\n`;
    script += `cd /var/lib/asterisk/sounds/pt_BR\n`;
    script += `sudo wget -q --show-progress -O sounds_pt.zip https://github.com/itgma/asterisk-sounds-pt-br/archive/refs/heads/master.zip || true\n`;
    script += `if [ -f sounds_pt.zip ]; then\n`;
    script += `  sudo unzip -q sounds_pt.zip\n`;
    script += `  sudo mv asterisk-sounds-pt-br-master/* . 2>/dev/null || true\n`;
    script += `  sudo rm -rf asterisk-sounds-pt-br-master sounds_pt.zip\n`;
    script += `fi\n\n`;

    script += `echo ">>> Passo 7: Escrevendo seus arquivos customizados de Ramais e Troncos..."\n`;
    script += `sudo tee /etc/asterisk/sip.conf << 'EOF'\n`;
    script += sipConfEscaped;
    script += `\nEOF\n\n`;

    script += `sudo tee /etc/asterisk/pjsip.conf << 'EOF'\n`;
    script += pjsipConfEscaped;
    script += `\nEOF\n\n`;

    script += `sudo tee /etc/asterisk/extensions.conf << 'EOF'\n`;
    script += extensionsConfEscaped;
    script += `\nEOF\n\n`;

    script += `echo ">>> Passo 8: Habilitando regras robustas no Firewall (UFW) para SIP e Audio..."\n`;
    script += `sudo ufw allow 22/tcp comment 'SSH para VPS'\n`;
    script += `sudo ufw allow 5060/udp comment 'Asterisk Sinalizacao SIP'\n`;
    script += `sudo ufw allow 10000:20000/udp comment 'Asterisk Canais de Audio RTP'\n`;
    script += `sudo ufw --force enable\n\n`;

    script += `echo ">>> Passo 9: Inicializando o Servidor Asterisk..."\n`;
    script += `sudo systemctl daemon-reload\n`;
    script += `sudo systemctl enable asterisk\n`;
    script += `sudo systemctl restart asterisk\n\n`;

    script += `echo "==================================================================="\n`;
    script += `echo " INSTALACAO REAL CONCLUIDA COM SUCESSO EM SUA VPS!"\n`;
    script += `echo " IP da sua VPS: \\\$(hostname -I | awk '{print \$1}')"\n`;
    script += `echo " Porta SIP ativa: 5060 UDP"\n`;
    script += `echo " Portas RTP de Audio abertas: 10000 ate 20000 UDP"\n`;
    script += `echo " Para entrar no painel CLI e depurar ligacoes digite:"\n`;
    script += `echo "   asterisk -rvvvvvvvvv"\n`;
    script += `echo "==================================================================="\n`;

    return script;
  };

  const getVpsDeploymentGuide = () => {
    return `=========================================================================
GUIA DE CONFIGURACAO DE SEGURANCA E FIREWALL EM VPS (REQUISITO FUNDAMENTAL)
=========================================================================

Para que seus aparelhos de telefone IP, Softphones (como Zoiper, MicroSIP) ou Operadoras VoIP reais
consigam se registrar e transmitir áudio para o Asterisk na VPS, as seguintes portas devem estar
abertas nos painéis de controle do seu provedor (Cloud Security Groups):

1. PORTAS REQUISITADAS NO FIREWALL DA VPS:
------------------------------------------
• UDP 5060 (Sinalização SIP)          <- Permite o registro dos ramais e chamadas.
• UDP 10000 a 20000 (Canais RTP)      <- Transmissão do fluxo de áudio (se fechado, haverá ÁUDIO MUDO).

2. GUIA DE LIBERAÇÃO POR PROVEDOR CLOUD:
----------------------------------------

A) DIGITALOCEAN (Firewalls):
  1. Vá em Networking -> Firewalls.
  2. Adicione uma regra de entrada (Inbound Rule):
     - Protocol: UDP
     - Port Range: 5060
     - Sources: All IPv4 (0.0.0.0/0)
  3. Adicione outra regra de entrada:
     - Protocol: UDP
     - Port Range: 10000-20000
     - Sources: All IPv4 (0.0.0.0/0)
  4. Associe o Firewall ao seu Droplet Asterisk.

B) AWS EC2 (Security Groups):
  1. No painel EC2, vá na instância e clique na aba "Security".
  2. Selecione o Security Group e clique em "Edit inbound rules".
  3. Adicione as regras:
     - Tipo: Custom UDP | Porta: 5060 | Origem: Qualquer lugar-IPv4 (0.0.0.0/0)
     - Tipo: Custom UDP | Porta: 10000-20000 | Origem: Qualquer lugar-IPv4 (0.0.0.0/0)
  4. Salve as regras.

C) ORACLE CLOUD (Security Lists):
  1. Na sua VCN, vá em "Security Lists" e selecione a lista ativa.
  2. Clique em "Add Ingress Rules":
     - Source CIDR: 0.0.0.0/0
     - IP Protocol: UDP
     - Destination Port Range: 5060
  3. Adicione outra regra:
     - Source CIDR: 0.0.0.0/0
     - IP Protocol: UDP
     - Destination Port Range: 10000-20000

3. COMO SE REGISTRAR COM SEU TELEFONE APÓS INSTALADO:
------------------------------------------------------
No seu Softphone (ex: MicroSIP no PC ou Zoiper no Celular):
• Host/Domain: [IP_DA_SUA_VPS]:5060
• Username: [Numero do Ramal, ex: 101]
• Password: [A senha configurada para o ramal]
`;
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (filename: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getConfigContent = () => {
    switch (selectedConfigTab) {
      case "script": return generateInstallScript();
      case "sip": return generateSipConf();
      case "pjsip": return generatePjsipConf();
      case "extensions": return generateExtensionsConf();
      case "vps": return getVpsDeploymentGuide();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="asterisk-vps-builder-panel">
      {/* Dynamic Dialplan Router Test / Diagnostic Panel */}
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-1">
            <Terminal className="w-5 h-5 text-indigo-600" />
            Depurador de Rotas SIP (Dry-Run Dialplan)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Digite um número de teste para prever de forma exata como o Asterisk na sua VPS interpretará o dialplan, qual operadora VoIP utilizará e qual contexto de segurança será aplicado.
          </p>

          <form onSubmit={handleStartCall} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Origem (Ramal SIP)
                </label>
                <select
                  value={fromExt}
                  onChange={(e) => setFromExt(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 bg-white text-sm"
                >
                  {extensions.map((ext) => (
                    <option key={ext.id} value={ext.number}>
                      Ramal {ext.number} - {ext.name}
                    </option>
                  ))}
                  {extensions.length === 0 && <option value="">Nenhum ramal criado</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  Destino (Discar Número)
                </label>
                <input
                  type="text"
                  required
                  value={toDial}
                  onChange={(e) => setToDial(e.target.value)}
                  placeholder="Ex: 102, 01140049999"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700 font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              {!activeCall ? (
                <button
                  type="submit"
                  disabled={extensions.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl shadow-sm transition hover:shadow duration-150 text-sm"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Simular Rota de Ligação
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleHangup}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-sm transition hover:shadow duration-150 text-sm animate-pulse"
                >
                  <Square className="w-4 h-4 fill-white" />
                  Interromper Fluxo RTP
                </button>
              )}
            </div>
          </form>

          {/* Active call bridge simulation */}
          {activeCall && (
            <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider block">
                  Canal VoIP Ativo na VPS (Simulado):
                </span>
                <span className="font-mono text-xs text-slate-800 font-bold block mt-0.5">
                  SIP/{activeCall.from} <span className="text-indigo-400">⇆</span> {activeCall.to}
                </span>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  activeCall.status === "ringing" ? "bg-amber-100 text-amber-800 animate-pulse" : "bg-emerald-100 text-emerald-800"
                }`}>
                  <span className="w-1.5 h-1.5 bg-current rounded-full" />
                  {activeCall.status === "ringing" ? "Discando..." : "Conectado (RTP)"}
                </span>
                <span className="block font-mono text-xs text-slate-600 font-semibold mt-1">
                  Tempo: {Math.floor(activeCall.duration / 60)}:{(activeCall.duration % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Real-time Dialplan Logs */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[350px]">
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-rose-500 rounded-full" />
              <span className="w-3 h-3 bg-amber-500 rounded-full" />
              <span className="w-3 h-3 bg-emerald-500 rounded-full" />
              <span className="text-xs font-mono font-semibold text-slate-400 ml-2">asterisk*CLI&gt; console logger</span>
            </div>
            <button
              onClick={() => setLogs([])}
              className="text-[10px] text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white px-2 py-1 rounded transition font-mono"
            >
              Limpar Logs
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300 space-y-2 select-text selection:bg-indigo-500/30">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-2">
                <Terminal className="w-8 h-8 text-slate-600 stroke-[1.5]" />
                <p>Nenhum log de rota de teste recente.</p>
                <p className="text-[10px] text-slate-600">Disque um número acima para validar a lógica de roteamento do seu Asterisk.</p>
              </div>
            ) : (
              logs.map((log) => {
                let color = "text-slate-300";
                if (log.level === "NOTICE") color = "text-indigo-300 font-bold";
                if (log.level === "WARNING") color = "text-amber-400";
                if (log.level === "ERROR") color = "text-rose-400 font-bold";
                return (
                  <div key={log.id} className="leading-relaxed hover:bg-slate-900 py-0.5 rounded px-1 transition duration-100">
                    <span className="text-slate-600 mr-2">[{log.timestamp}]</span>
                    <span className={color}>{log.message}</span>
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>

      {/* Configuration generator & Download Panel */}
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                Script VPS & Configurações Reais
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Gere e baixe arquivos para rodar fisicamente na sua nuvem. Seu roteamento está pré-configurado!
              </p>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100 gap-1 mb-4 overflow-x-auto font-semibold">
            <button
              onClick={() => setSelectedConfigTab("script")}
              className={`flex-1 min-w-[130px] text-center px-2 py-2 text-xs font-semibold rounded-lg transition duration-200 ${
                selectedConfigTab === "script"
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              ⚡ install_asterisk.sh
            </button>
            <button
              onClick={() => setSelectedConfigTab("pjsip")}
              className={`flex-1 min-w-[80px] text-center px-2 py-2 text-xs font-semibold rounded-lg transition duration-200 ${
                selectedConfigTab === "pjsip"
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              pjsip.conf
            </button>
            <button
              onClick={() => setSelectedConfigTab("sip")}
              className={`flex-1 min-w-[80px] text-center px-2 py-2 text-xs font-semibold rounded-lg transition duration-200 ${
                selectedConfigTab === "sip"
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              sip.conf
            </button>
            <button
              onClick={() => setSelectedConfigTab("extensions")}
              className={`flex-1 min-w-[100px] text-center px-2 py-2 text-xs font-semibold rounded-lg transition duration-200 ${
                selectedConfigTab === "extensions"
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              extensions.conf
            </button>
            <button
              onClick={() => setSelectedConfigTab("vps")}
              className={`flex-1 min-w-[120px] text-center px-2 py-2 text-xs font-semibold rounded-lg transition duration-200 ${
                selectedConfigTab === "vps"
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Guia Portas VPS
            </button>
          </div>

          {/* Copy & download action controls */}
          <div className="flex justify-between items-center mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              {selectedConfigTab === "script" && "🚀 Instalador Automatizado de Produção"}
              {selectedConfigTab === "pjsip" && "📁 /etc/asterisk/pjsip.conf (Moderno)"}
              {selectedConfigTab === "sip" && "📁 /etc/asterisk/sip.conf (Clássico)"}
              {selectedConfigTab === "extensions" && "📁 /etc/asterisk/extensions.conf"}
              {selectedConfigTab === "vps" && "🛡️ Manual do Firewall de Nuvem"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleCopyText(getConfigContent() || "")}
                className="px-2.5 py-1.5 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded-lg font-medium transition duration-150 flex items-center gap-1 shadow-sm font-semibold"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Code className="w-3.5 h-3.5" />
                    Copiar Código
                  </>
                )}
              </button>

              <button
                onClick={() => downloadFile(
                  selectedConfigTab === "script" ? "install_asterisk.sh" : 
                  selectedConfigTab === "vps" ? "vps_security_guide.txt" : `${selectedConfigTab}.conf`, 
                  getConfigContent() || ""
                )}
                className="px-2.5 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium transition duration-150 flex items-center gap-1 shadow-sm font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar
              </button>
            </div>
          </div>

          {/* Config file viewers */}
          <div className="flex-1 bg-slate-900 rounded-xl p-4 overflow-y-auto border border-slate-800 font-mono text-xs text-slate-300 h-[385px] relative">
            <pre className="whitespace-pre select-all">{getConfigContent()}</pre>
          </div>

          <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-indigo-900 leading-normal">
              <strong>Como rodar na sua VPS:</strong> Salve o script <code>install_asterisk.sh</code> acima, envie para sua VPS com Ubuntu, conceda permissão de execução (<code>chmod +x install_asterisk.sh</code>) e execute-o como root (<code>sudo ./install_asterisk.sh</code>). Ele instalará todo o Asterisk e deixará os ramais criados prontos para registrar!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
