# 🚀 GUIA RÁPIDO - IMPLEMENTAÇÃO SEGURA (30 minutos)

---

## ⚡ ANTES DE COMEÇAR

- ✅ Você já revogou a chave Gemini antiga? (SIM/NÃO)
- ✅ Você tem `.gitignore` criado? (SIM/NÃO)
- ✅ Você tem `.env` criado? (SIM/NÃO)

---

## 📋 PASSO-A-PASSO PRÁTICO

### **PASSO 1** - Preparar estrutura (5 min)

#### 1.1 - Criar pasta backend

```bash
# Na raiz do seu repositório
mkdir backend
cd backend
npm init -y
```

#### 1.2 - Instalar dependências

```bash
npm install express cors dotenv @google/generative-ai jsonwebtoken express-rate-limit helmet
npm install --save-dev nodemon
```

---

### **PASSO 2** - Criar arquivos (10 min)

#### 2.1 - Backend `.env`

**Arquivo:** `backend/.env`

```env
GEMINI_API_KEY=sua-nova-chave-aqui-copie-e-cole
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=http://localhost:3000,https://nzmnicolas-maker.github.io
JWT_SECRET=chave-super-secreta-aleatorio-12345-nao-use-essa
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

#### 2.2 - Backend `.gitignore`

**Arquivo:** `backend/.gitignore`

```
node_modules/
.env
.env.local
npm-debug.log
dist/
build/
.DS_Store
.idea/
.vscode/
```

#### 2.3 - Backend `package.json` (atualizar scripts)

Modificar a seção `"scripts"`:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

---

### **PASSO 3** - Criar servidor (10 min)

#### 3.1 - `backend/server.js`

```javascript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Segurança
app.use(helmet());

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin.trim())) {
      callback(null, true);
    } else {
      callback(new Error('CORS não permitido'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10kb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API Chat (IMPLEMENTAR DEPOIS)
app.post('/api/chat', (req, res) => {
  // TODO: Implementar lógica de chat
  res.json({ message: 'Chat endpoint' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Erro interno' });
});

// Iniciar
app.listen(PORT, () => {
  console.log(`🚀 Servidor em http://localhost:${PORT}`);
});
```

#### 3.2 - Testar localmente

```bash
cd backend
npm run dev

# Em outro terminal, testar:
curl http://localhost:3000/health
```

---

### **PASSO 4** - Adicionar autenticação (5 min)

#### 4.1 - `backend/middleware/auth.js`

```javascript
import jwt from 'jsonwebtoken';

export default (req, res, next) => {
  try {
    const token = req.headers.authorization?.substring(7);
    if (!token) return res.status(401).json({ error: 'Sem token' });
    
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};
```

#### 4.2 - `backend/config/gemini.js`

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

export const getGeminiModel = () => {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ 
    model: "gemini-2.5-flash"
  });
};
```

#### 4.3 - `backend/routes/chat.js`

```javascript
import express from 'express';
import { getGeminiModel } from '../config/gemini.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const chatSessions = new Map();

// Gerar token
router.get('/token', (req, res) => {
  const token = jwt.sign(
    { userId: `guest_${Date.now()}` },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({ token, type: 'Bearer' });
});

// Enviar mensagem
router.post('/', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message || message.length > 5000) {
      return res.status(400).json({ error: 'Mensagem inválida' });
    }

    const model = getGeminiModel();
    const response = await model.generateContent(message);
    const reply = response.response.text();

    res.json({ success: true, reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao processar' });
  }
});

export default router;
```

#### 4.4 - Atualizar `server.js`

```javascript
import chatRoutes from './routes/chat.js';
import authMiddleware from './middleware/auth.js';

// ... resto do código ...

// Adicionar rotas (DEPOIS de CORS)
app.get('/api/chat/token', chatRoutes);
app.post('/api/chat', authMiddleware, chatRoutes);
```

---

### **PASSO 5** - Atualizar frontend (5 min)

#### 5.1 - `frontend/assistant-client.js`

```javascript
class AssistantClient {
  constructor(apiEndpoint = '/api/chat') {
    this.apiEndpoint = apiEndpoint;
    this.token = null;
  }

  async initialize() {
    try {
      const response = await fetch(`${this.apiEndpoint}/token`);
      const data = await response.json();
      this.token = data.token;
      return true;
    } catch (error) {
      console.error('Erro:', error);
      return false;
    }
  }

  async sendMessage(message) {
    if (!this.token) throw new Error('Não inicializado');

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ message })
    });

    const data = await response.json();
    return data.reply;
  }
}

window.AssistantClient = AssistantClient;
```

#### 5.2 - `frontend/index.html`

Adicionar no `</body>`:

```html
<script src="assistant-client.js"></script>
<button id="chatBtn" onclick="openChat()" style="position:fixed;bottom:80px;right:20px;width:56px;height:56px;border-radius:50%;background:#007AFF;color:white;border:none;cursor:pointer;font-size:24px;">💬</button>

<script>
  const assistant = new AssistantClient();
  
  window.addEventListener('load', async () => {
    const ready = await assistant.initialize();
    if (ready) document.getElementById('chatBtn').style.display = 'flex';
  });

  async function openChat() {
    const msg = prompt('Sua pergunta:');
    if (msg) {
      try {
        const reply = await assistant.sendMessage(msg);
        alert(reply);
      } catch (err) {
        alert('Erro: ' + err.message);
      }
    }
  }
</script>
```

---

## ☁️ PASSO 6 - DEPLOY (5 min)

### Opção A: Replit (RECOMENDADO para iniciantes)

```
1. Acesse replit.com
2. Clique "+ Create" → Node.js
3. Copie todo o conteúdo de backend/
4. Crie arquivo "Secrets" (🔑) com seu .env
5. Clique "Run"
6. URL será: https://seu-nome.replit.dev
```

**Atualizar frontend:**

```javascript
// assistant-client.js
const assistant = new AssistantClient('https://seu-nome.replit.dev/api/chat');
```

### Opção B: GitHub + Vercel (Automático)

```
1. Push seu backend para GitHub
2. Acesse vercel.com
3. Conecte seu repositório
4. Adicione variáveis de ambiente
5. Deploy automático
```

---

## ✅ CHECKLIST FINAL

- [ ] `.env` criado com chave Gemini NOVA
- [ ] `.gitignore` contém `.env`
- [ ] `npm install` executado
- [ ] Servidor inicia com `npm run dev`
- [ ] `/health` retorna `{"status":"ok"}`
- [ ] `/api/chat/token` retorna token JWT
- [ ] `/api/chat` recebe POST e responde
- [ ] Frontend conecta ao backend
- [ ] Assistente funciona no celular
- [ ] Deploy feito em Replit/Railway/Vercel

---

## 🆘 ERROS COMUNS

### Erro: "Cannot find module 'express'"
```bash
npm install
```

### Erro: "GEMINI_API_KEY is undefined"
```bash
# Verificar .env
cat .env

# Reiniciar servidor
npm run dev
```

### Erro: "CORS não permitido"
```bash
# Atualizar ALLOWED_ORIGINS em .env
ALLOWED_ORIGINS=http://localhost:3000,https://seu-site.com
```

### Erro: "401 Unauthorized"
```javascript
// Verificar token antes de enviar
console.log('Token:', assistant.token);
```

---

## 🔒 SEGURANÇA

**NUNCA faça:**
- ❌ Commitar `.env` para GitHub
- ❌ Colocar chaves no código
- ❌ Expor chaves em screenshots
- ❌ Usar mesma chave em produção e dev

**SEMPRE faça:**
- ✅ Usar variáveis de ambiente
- ✅ Autenticar requisições
- ✅ Limitar taxa de requisições
- ✅ Validar entrada de dados

---

## 📞 SUPORTE

Se tiver erro:
1. Verifique console.log() no backend
2. Veja resposta no DevTools (F12)
3. Compare com código acima
4. Teste com `curl`:

```bash
# Testar health
curl http://localhost:3000/health

# Testar token
curl http://localhost:3000/api/chat/token

# Testar chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{"message":"Oi"}'
```

---

**Você consegue! Implementação rápida e segura! 🚀🔐**

