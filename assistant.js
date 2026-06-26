/* ======================================================
   ASSISTENTE DE ESTUDOS — Odonto // Estudos
   ======================================================
   Atenção: A chave da API agora é carregada automaticamente 
   do localStorage do seu navegador. 
   NUNCA cole sua chave aqui no código.
   ====================================================== */

const GEMINI_MODEL = "gemini-1.5-flash";

// Função para buscar a chave salva no navegador
function getApiKey() {
  return localStorage.getItem('GEMINI_API_KEY_ODONTO');
}

(function(){
  let chatHistory = []; 
  let isWaiting = false;

  function currentSubjectContext(){
    return window.currentOpenSubject || null;
  }

  function systemInstruction(){
    const subj = currentSubjectContext();
    let base = "Você é um assistente de estudos de Odontologia, ajudando uma estudante a revisar o conteúdo das disciplinas do curso. " +
      "Responda sempre em português do Brasil, de forma clara, didática e organizada (pode usar listas e negrito quando ajudar). " +
      "Seja preciso tecnicamente. Se a pergunta não tiver relação com Odontologia ou com os estudos, responda com gentileza que você é focado em ajudar com o conteúdo do curso.";
    if(subj){
      base += `\n\nA aluna está estudando agora a disciplina "${subj.disciplina}" (${subj.codigo}). ` +
        "Use o conteúdo de referência abaixo como base principal para responder, mas você pode complementar com seu conhecimento geral de Odontologia quando fizer sentido:\n\n---\n" +
        subj.body + "\n---";
    }
    return base;
  }

  async function sendToGemini(userText){
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("Chave de API não configurada.");

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const contents = chatHistory.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: userText }] });

    const body = {
      contents: contents,
      systemInstruction: { parts: [{ text: systemInstruction() }] },
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 }
    };

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if(!res.ok){
      const errText = await res.text();
      throw new Error(`Erro ${res.status}: Ocorreu um problema na comunicação com a API.`);
    }
    const data = await res.json();
    const candidate = data.candidates && data.candidates[0];
    const text = candidate && candidate.content && candidate.content.parts
      ? candidate.content.parts.map(p => p.text || '').join('')
      : '(sem resposta)';
    return text;
  }

  function initWidget(){
    const panel = document.getElementById('aiPanel');
    const toggleBtn = document.getElementById('aiToggleBtn');
    const closeBtn = document.getElementById('aiCloseBtn');
    const input = document.getElementById('aiInput');
    const sendBtn = document.getElementById('aiSendBtn');
    const messages = document.getElementById('aiMessages');

    if(!panel || !toggleBtn) return; 

    toggleBtn.onclick = () => {
      panel.classList.toggle('open');
      if(panel.classList.contains('open')) input.focus();
    };
    closeBtn.onclick = () => panel.classList.remove('open');

    function appendMessage(role, text){
      const div = document.createElement('div');
      div.className = 'ai-msg ' + (role === 'user' ? 'ai-msg-user' : 'ai-msg-model');
      div.innerHTML = (typeof marked !== 'undefined') ? marked.parse(text) : text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    async function handleSend(){
      const text = input.value.trim();
      if(!text || isWaiting) return;

      // Verifica se a chave existe antes de enviar
      if(!getApiKey()){
        appendMessage('user', text);
        input.value = '';
        appendMessage('model', '⚠ **API Key não encontrada!**<br>Clique no botão ⚙️ (engrenagem) no menu lateral para configurar sua chave corretamente.');
        return;
      }

      appendMessage('user', text);
      input.value = '';
      input.style.height = 'auto';
      isWaiting = true;
      sendBtn.disabled = true;

      try{
        const reply = await sendToGemini(text);
        appendMessage('model', reply);
        chatHistory.push({ role: 'user', text: text });
        chatHistory.push({ role: 'model', text: reply });
        if(chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
      }catch(err){
        appendMessage('model', '⚠ Não consegui responder agora. Verifique se sua chave API está correta e tente novamente.');
      }finally{
        isWaiting = false;
        sendBtn.disabled = false;
      }
    }

    sendBtn.onclick = handleSend;
    input.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        handleSend();
      }
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
