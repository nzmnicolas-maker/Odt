/* ======================================================
   ASSISTENTE DE ESTUDOS — Odonto // Estudos
   ======================================================
   1. Cole sua chave da API do Gemini na linha abaixo,
      entre as aspas, no lugar de COLE_SUA_CHAVE_AQUI.
   2. Gere a chave grátis em: https://aistudio.google.com/apikey
   3. Nunca compartilhe essa chave por print/mensagem —
      cole direto aqui no arquivo, no seu próprio dispositivo.
====================================================== */
const GEMINI_API_KEY = "";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

(function(){
  let chatHistory = []; // {role: 'user'|'model', text: '...'}
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
      throw new Error(`Erro ${res.status}: ${errText.slice(0,200)}`);
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
    const subjectLabel = document.getElementById('aiSubjectLabel');

    if(!panel || !toggleBtn) return; // widget markup not present, skip silently

    function updateSubjectLabel(){
      const subj = currentSubjectContext();
      subjectLabel.textContent = subj ? `lendo: ${subj.disciplina}` : 'nenhuma disciplina aberta';
    }

    toggleBtn.onclick = () => {
      panel.classList.toggle('open');
      if(panel.classList.contains('open')){
        updateSubjectLabel();
        input.focus();
      }
    };
    closeBtn.onclick = () => panel.classList.remove('open');

    function appendMessage(role, text){
      const div = document.createElement('div');
      div.className = 'ai-msg ' + (role === 'user' ? 'ai-msg-user' : 'ai-msg-model');
      div.innerHTML = (typeof marked !== 'undefined') ? marked.parse(text) : text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
      return div;
    }

    function appendLoading(){
      const div = document.createElement('div');
      div.className = 'ai-msg ai-msg-model ai-msg-loading';
      div.id = 'aiLoadingMsg';
      div.textContent = 'digitando...';
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }
    function removeLoading(){
      const el = document.getElementById('aiLoadingMsg');
      if(el) el.remove();
    }

    async function handleSend(){
      const text = input.value.trim();
      if(!text || isWaiting) return;

      if(GEMINI_API_KEY === 'COLE_SUA_CHAVE_AQUI'){
        appendMessage('user', text);
        input.value = '';
        input.style.height = 'auto';
        appendMessage('model', '⚠ A chave da API ainda não foi configurada no arquivo `assistant.js`. Peça pra quem configurou o site colar a chave do Gemini lá.');
        return;
      }

      appendMessage('user', text);
      input.value = '';
      input.style.height = 'auto';
      isWaiting = true;
      sendBtn.disabled = true;
      appendLoading();

      try{
        const reply = await sendToGemini(text);
        removeLoading();
        appendMessage('model', reply);
        chatHistory.push({ role: 'user', text: text });
        chatHistory.push({ role: 'model', text: reply });
        if(chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
      }catch(err){
        removeLoading();
        appendMessage('model', '⚠ Não consegui responder agora (' + err.message + '). Tenta de novo em alguns segundos.');
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
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // refresh subject label whenever a subject is opened elsewhere on the page
    document.addEventListener('click', () => setTimeout(updateSubjectLabel, 50));
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
