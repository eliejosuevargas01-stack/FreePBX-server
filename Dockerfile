# =========================================================
# DOCKERFILE PARA DEPLOY DE PRODUÇÃO NO COOLIFY
# =========================================================

FROM node:20-alpine
WORKDIR /app

# Copia apenas os manifestos de pacotes primeiro para aproveitar o cache de camadas do Docker
COPY package.json ./
COPY package-lock.json* ./

# Instala todas as dependências necessárias para compilação e execução
RUN npm install

# Copia todo o restante do código fonte
COPY . .

# Variáveis de ambiente padrão para a build e execução
ENV NODE_ENV=production
ENV PORT=3000

# Executa a compilação (gera a pasta dist/ com o cliente React e dist/server.cjs)
RUN npm run build

# Remove dependências de desenvolvimento para manter a imagem leve
RUN npm prune --production

# Expõe a porta de rede da aplicação
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "dist/server.cjs"]

