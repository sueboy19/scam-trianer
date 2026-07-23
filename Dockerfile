# ============================================
# 正式環境 Dockerfile（單容器）
# ============================================
# Build：client(Vite) + server(TS) → 統一輸出
# Run：Express 同時 serve API + 靜態 Vue + SQLite
#
# 兩個 stage 都用 alpine（musl），確保 better-sqlite3 native binary 一致。

# ===== Stage 1: builder =====
# Node 24 = 目前 Active LTS（Node 26 要 2026/10 才進 LTS）。
# 兩個 stage 都用 alpine（musl），確保 better-sqlite3 native binary 一致。
FROM node:24-alpine AS builder

# better-sqlite3 需要 native build tools
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 先複製 manifests 以利用 Docker layer cache
COPY package.json package-lock.json* ./
COPY server/package.json server/package-lock.json* ./server/
COPY client/package.json client/package-lock.json* ./client/

# 安裝依賴（含 dev，build 用）。
# 注意：根目錄 package.json 僅含 concurrently（本機 dev 用），正式容器不需要，不安裝。
RUN cd server && (npm ci --legacy-peer-deps || npm install --legacy-peer-deps)
RUN cd client && (npm ci || npm install)

# 複製原始碼
COPY . .

# 建置：client（輸出到 server/public）+ server（輸出到 server/dist）
RUN cd client && npm run build
RUN cd server && npm run build

# ===== Stage 2: production =====
FROM node:24-alpine AS production

# dumb-init 處理 PID 1 signal；wget 給 healthcheck
RUN apk add --no-cache dumb-init wget

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/app.db

# 只安裝 server 的 production 依賴
COPY --chown=node:node server/package.json server/package-lock.json* ./server/
# npm ci 需在 root 下執行（寫入 node_modules/.cache 等），之後再 chown
RUN cd server && (npm ci --omit=dev --legacy-peer-deps || npm install --omit=dev --legacy-peer-deps) \
    && npm cache clean --force \
    && chown -R node:node /app/server

# 從 builder 複製產物（server/package.json 上面已 COPY，不重複）；直接以 node 所有權複製
COPY --from=builder --chown=node:node /app/server/dist ./server/dist
COPY --from=builder --chown=node:node /app/server/public ./server/public
COPY --from=builder --chown=node:node /app/scripts ./scripts

# 建立 SQLite 資料目錄（給 volume 掛載），並移交所有權給非 root 使用者
RUN mkdir -p /app/data && chown -R node:node /app/data

EXPOSE 3000

# 以非 root 使用者執行（node:20-alpine 內建 uid 1000 的 node 使用者）
USER node

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/dist/index.js"]
