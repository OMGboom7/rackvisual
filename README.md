# RackVisual

**家庭实验室与数据中心机柜的交互式 3D 可视化工具**

RackVisual 是一款自托管的 Web 应用，用于在交互式 3D 环境中规划、填充和管理服务器机柜。无需云服务，无需注册——所有内容通过 Docker 在您自己的硬件上运行。

---

## 功能特性

- **3D 机柜可视化** — 基于 React Three Fiber / Three.js 的真实渲染
- **多机柜管理** — 管理任意数量的机柜项目（如"地下室"、"办公室"）
- **组件库** — 内置服务器、交换机、配线架、UPS、PDU、KVM、盲板等模型；支持上传自定义 GLTF/GLB 模型
- **拖拽操作** — 直接在 3D 视图中拖拽组件到空闲槽位
- **碰撞检测** — 已占用的槽位自动检测并阻止放置
- **线缆管理** — 端口到端口的网络和电源线缆连接
- **组件详情** — 操作系统、IP 地址、硬件信息（CPU/内存/GPU/存储）、虚拟机、容器、标签、VLAN、电源回路
- **VLAN 与回路管理** — 每机柜的逻辑网络和电源回路管理
- **视图模式** — 正面、背面、自由视角控制
- **本地优先** — 所有数据存储为本地 SQLite 文件，无外部依赖

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React 18, TypeScript, Vite |
| 3D 引擎 | React Three Fiber, drei, Three.js |
| 状态管理 | Zustand, TanStack Query |
| 样式 | Tailwind CSS |
| 后端 | Node.js, Express.js |
| 数据库 | SQLite (better-sqlite3) |
| 文件上传 | Multer (GLTF / GLB) |
| 基础设施 | Docker, Docker Compose, Nginx |

---

## 快速开始

### 环境要求

- [Docker](https://www.docker.com/) 及 Docker Compose

### 启动开发环境

```bash
git clone https://github.com/OMGboom7/rackvisual.git
cd rackvisual
docker-compose up
```

| 服务 | 地址 |
|---|---|
| 前端 (Vite) | http://localhost:5173 |
| API (Express) | http://localhost:3001 |

SQLite 数据库和上传的模型自动存储在 `./data/` 目录下。

### 生产环境 (Nginx)

```bash
docker-compose -f docker-compose.prod.yml up
```

应用以打包构建的形式运行在 **http://localhost:80**。Nginx 将所有 `/api` 请求代理到后端容器。

---

## 项目结构

```
rackvisual/
├── api/                  # Express.js 后端
│   └── src/
│       ├── routes/       # REST 接口 (racks, components, cables, vlans, …)
│       ├── db/           # SQLite 连接与数据库迁移
│       └── seed.ts       # 内置组件模型
│
├── frontend/             # React + Vite 前端
│   └── src/
│       ├── components/
│       │   ├── three/    # 3D 场景 (Scene, RackChassis, ComponentMesh, …)
│       │   └── ui/       # 覆盖面板 (Library, Detail, Toolbar, …)
│       ├── api/          # React Query 数据请求
│       ├── store/        # Zustand 全局状态
│       └── lib/          # 机柜几何与槽位计算
│
├── data/                 # 持久化数据 (SQLite + 模型上传) — git 忽略
├── docs/                 # 设计文档与规格
├── docker-compose.yml
└── docker-compose.prod.yml
```

---

## API 参考

| 方法 | 路由 | 说明 |
|---|---|---|
| GET / POST | `/racks` | 列出 / 创建机柜 |
| PUT / DELETE | `/racks/:id` | 重命名 / 删除机柜 |
| GET / POST | `/racks/:id/components` | 列出 / 添加组件 |
| PUT / DELETE | `/racks/:id/components/:cid` | 更新 / 移除组件 |
| GET / POST / DELETE | `/racks/:id/cables` | 线缆连接 |
| GET / POST / DELETE | `/racks/:id/vlans` | VLAN 管理 |
| GET / POST / DELETE | `/racks/:id/circuits` | 电源回路 |
| GET | `/models` | 列出组件模型 |
| POST | `/models/upload` | 上传自定义 GLTF/GLB 模型 |
| DELETE | `/models/:id` | 删除自定义模型 |
| GET | `/api/health` | 健康检查 |

---

## 数据持久化

所有数据存储在本地：

```
./data/
├── rackvisual.db    # SQLite 数据库 (WAL 模式)
└── models/          # 上传的 GLTF/GLB 文件
```

`./data/` 目录已通过 `.gitignore` 排除版本控制，并作为 Docker 卷挂载。

---

## 无 Docker 的本地开发

**API:**
```bash
cd api
npm install
npm run dev        # Express 启动在 3001 端口
```

**前端:**
```bash
cd frontend
npm install
npm run dev        # Vite 启动在 5173 端口
```

**测试:**
```bash
npm run test       # Vitest (在 api/ 和 frontend/ 目录下均可运行)
```

---

## 许可证

MIT
