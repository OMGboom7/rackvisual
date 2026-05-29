#!/bin/bash
API_DIR="/home/node/.openclaw/workspace/rackvisual/api"
API_LOG="/tmp/rackvisual-api.log"

# 检查 API 是否存活
if ! curl -sf http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
  echo "[$(date)] API 挂了，正在重启..." >> "$API_LOG"
  cd "$API_DIR" && nohup npx tsx src/index.ts >> "$API_LOG" 2>&1 &
  sleep 3
  if curl -sf http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
    echo "[$(date)] 重启成功" >> "$API_LOG"
  else
    echo "[$(date)] 重启失败" >> "$API_LOG"
  fi
fi
