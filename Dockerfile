# =========================================================
# DOCKERFILE PARA DEPLOY DE PRODUÇÃO NO COOLIFY
# =========================================================

# Estágio 1: Build da aplicação (Compilação)
FROM node:20-alpine AS builder
WORKDIR /app

# Copia manifestos de pacotes
COPY package*.json ./

# Instala todas as dependências (necessário para a compilação do TypeScript/Vite)
RUN npm install

# Copia o restante do código fonte
COPY . .

# Variável de ambiente para otimização de build
ENV NODE_ENV=production

# Executa o build (gera as páginas estáticas no dist/ e o servidor em dist/server.cjs)
RUN npm run build

# Estágio 2: Executor de Produção (Runner ultra-leve)
FROM node:20-alpine AS runner
WORKDIR /app

# Variável de ambiente padrão para produção
ENV NODE_ENV=production
ENV PORT=3000

# Copia apenas os manifestos de pacotes para instalar dependências de produção
COPY package*.json ./
RUN npm install --omit=dev

# Copia os arquivos compilados do estágio anterior
COPY --from=builder /app/dist ./dist

# Expõe a porta de escuta da aplicação
EXPOSE 3000

# Comando padrão de inicialização
CMD ["node", "dist/server.cjs"]
