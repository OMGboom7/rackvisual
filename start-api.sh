#!/bin/bash
API_DIR="/home/node/.openclaw/workspace/rackvisual/api"
API_LOG="/tmp/rackvisual-api.log"

cd "$API_DIR"

# 启动 API
nohup npx tsx src/index.ts > "$API_LOG" 2>&1 &
API_PID=$!
echo "API started (PID=$API_PID)" >> "$API_LOG"

# 每 3 分钟检查一次
while true; do
  sleep 180
  if ! curl -sf http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
    echo "[$(date)] API 挂了，正在重启..." >> "$API_LOG"
    cd "$API_DIR" && nohup npx tsx src/index.ts >> "$API_LOG" 2>&1 &
    echo "[$(date)] 重启新 PID=$!" >> "$API_LOG"
  fi
done
