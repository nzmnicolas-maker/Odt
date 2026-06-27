/* ======================================================
   ASSISTENTE DE ESTUDOS — Odonto // Estudos
   ======================================================
   🔐 VERSÃO SEGURA - Comunicação Backend
   
   ✅ SEM chave API no frontend
   ✅ SEM localStorage de chaves sensíveis
   ✅ Autenticação via JWT
   ✅ Rate limiting no servidor
   ====================================================== */

class OdontoAssistant {
  constructor(backendUrl = '/api/chat') {
    this.backendUrl = backendUrl;
    this.token = null;
    this.sessionId = this.generateSessionId();
    this.chatHistory = [];
    this.isWaiting = false;
    this.isInitialized = false;
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Inicializar assistente (obter token do backend)
   */
  async initialize() {
    try {
      const response = await fetch(`${this.backendUrl}/token`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Erro ao conectar com servidor');
      }

      const data = await response.json();
      this.token = data.token;
      this.isInitialized = true;

      console.log('✅ Assistente inicializado com segurança');
      return true;
    } catch (error) {
      console.error('❌ Erro ao inicializar assistente:', error);
      this.showError('Não consegui conectar com o assistente. Tente recarregar a página.');
      return false;
    }
  }

  /**
   * Enviar mensagem para o assistente
   */
  async sendMessage(userText) {
    if (!this.isInitialized) {
      this.showError('Assistente não inicializado. Carregando...');
      const ready = await this.initialize();
      if (!ready) return null;
    }

    if (!userText || userText.trim().length === 0) {
      return null;
    }

    this.isWaiting = true;

    try {
      const response = await fetch(this.backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          message: userText,
          sessionId: this.sessionId,
          currentSubject: window.currentOpenSubject || null
        })
      });

      if (response.status === 401) {
        // Token expirado, obter novo
        this.token = null;
        const ready = await this.initialize();
        if (!ready) {
          this.showError('Sua sessão expirou. Recarregue a página.');
          return null;
        }
        // Tentar novamente
        return this.sendMessage(userText);
      }

      if (response.status === 429) {
        this.showError('⏱️ Muitas requisições. Aguarde alguns segundos e tente novamente.');
        return null;
      }

      if (!response.ok) {
        const errorData = await response.json();
        this.showError(errorData.error || 'Erro ao processar sua mensagem');
        return null;
      }

      const data = await response.json();
      
      // Adicionar ao histórico
      this.chatHistory.push({ role: 'user', text: userText });
      this.chatHistory.push({ role: 'model', text: data.reply });

      // Manter apenas últimas 20 mensagens
      if (this.chatHistory.length > 40) {
        this.chatHistory = this.chatHistory.slice(-40);
      }

      return data.reply;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      this.showError('Erro de conexão. Verifique sua internet e tente novamente.');
      return null;
    } finally {
      this.isWaiting = false;
    }
  }

  /**
   * Definir disciplina atual (para contexto)
   */
  setCurrentSubject(subject) {
    if (subject) {
      console.log(`📚 Contexto atualizado: ${subject.disciplina}`);
    }
  }

  /**
   * Exibir erro para usuário
   */
  showError(message) {
    const errorDiv = document.getElementById('aiErrorMsg');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 5000);
    }
  }
}

/**
 * Inicializar Widget de Chat na Página
 */
(function() {
  let assistant = null;

  function initWidget() {
    const panel = document.getElementById('aiPanel');
    const toggleBtn = document.getElementById('aiToggleBtn');
    const closeBtn = document.getElementById('aiCloseBtn');
    const input = document.getElementById('aiInput');
    const sendBtn = document.getElementById('aiSendBtn');
    const messages = document.getElementById('aiMessages');

    if (!panel || !toggleBtn || !assistant) {
      console.warn('⚠️ Elementos do assistente não encontrados');
      return;
    }

    // Determinar URL do backend
    const backendUrl = window.ASSISTANT_BACKEND_URL || '/api/chat';
    assistant = new OdontoAssistant(backendUrl);

    // Abrir/Fechar painel
    toggleBtn.onclick = () => {
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) {
        input.focus();
        // Inicializar se necessário
        if (!assistant.isInitialized) {
          assistant.initialize();
        }
      }
    };

    closeBtn.onclick = () => panel.classList.remove('open');

    // Adicionar mensagem ao painel
    function appendMessage(role, text) {
      const div = document.createElement('div');
      div.className = 'ai-msg ' + (role === 'user' ? 'ai-msg-user' : 'ai-msg-model');
      
      // Renderizar markdown se disponível
      if (typeof marked !== 'undefined') {
        div.innerHTML = marked.parse(text);
      } else {
        div.textContent = text;
      }
      
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    // Enviar mensagem
    async function handleSend() {
      const text = input.value.trim();
      if (!text || assistant.isWaiting) return;

      appendMessage('user', text);
      input.value = '';
      input.style.height = 'auto';
      sendBtn.disabled = true;

      const reply = await assistant.sendMessage(text);
      
      if (reply) {
        appendMessage('model', reply);
      } else {
        appendMessage('model', '⚠️ Não consegui responder. Tente novamente.');
      }

      sendBtn.disabled = false;
      input.focus();
    }

    // Event listeners
    sendBtn.onclick = handleSend;
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
  }

  // Inicializar quando o DOM está pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

  // Expor globalmente se necessário
  window.OdontoAssistant = OdontoAssistant;
})();
