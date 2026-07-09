const WORKER_URL = "https://fancy-fire-8436.nzmnicolas.workers.dev";

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
      "Seja preciso tecnicamente. Se a pergunta não tiver relação com Odontologia ou com os estudos, responda com gentileza que você é focado em ajudar com o conteúdo do curso. " +
      "IMPORTANTE: quando a aluna pedir uma quantidade específica de itens (ex: '5 exemplos', '3 questões'), sempre entregue a quantidade completa pedida, nunca pare no meio.";
    if(subj){
      base += `\n\nA aluna está estudando agora a disciplina "${subj.disciplina}" (${subj.codigo}). ` +
        "Use o conteúdo de referência abaixo como base principal para responder, mas você pode complementar com seu conhecimento geral de Odontologia quando fizer sentido:\n\n---\n" +
        subj.body + "\n---";
    }
    return base;
  }

  async function callGemini(contents){
    const body = {
      contents: contents,
      systemInstruction: { parts: [{ text: systemInstruction() }] },
      generationConfig: { temperature: 0.4, maxOutputTokens: 8192 }
    };

    const res = await fetch(WORKER_URL, {
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
    const finishReason = candidate ? candidate.finishReason : null;
    return { text, finishReason };
  }

  async function sendToAssistant(userText){
    const contents = chatHistory.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: userText }] });

    let { text, finishReason } = await callGemini(contents);

    // 🔧 Se ainda assim cortar por limite de tokens, pede pro modelo
    // continuar de onde parou, em vez de mostrar a resposta pela metade.
    let attempts = 0;
    while (finishReason === 'MAX_TOKENS' && attempts < 2) {
      attempts++;
      const continuationContents = [
        ...contents,
        { role: 'model', parts: [{ text }] },
        { role: 'user', parts: [{ text: 'Continue exatamente de onde parou, sem repetir o que já foi escrito.' }] }
      ];
      const cont = await callGemini(continuationContents);
      text += cont.text;
      finishReason = cont.finishReason;
    }

    return text;
  }

  // 🔧 MELHORIA: corrige o "bug" clássico de mobile onde o teclado virtual
  // (iOS/Android) sobrepõe a caixinha de digitar. Usa a Visual Viewport API
  // (quando disponível) pra empurrar o painel pra cima na altura exata do teclado.
  function setupKeyboardOffsetFix(){
    if(!window.visualViewport){
      document.documentElement.style.setProperty('--kb-offset', '0px');
      return;
    }
    const vv = window.visualViewport;
    function adjust(){
      const offset = Math.max(0, (window.innerHeight - vv.height - vv.offsetTop));
      document.documentElement.style.setProperty('--kb-offset', offset + 'px');
    }
    vv.addEventListener('resize', adjust);
    vv.addEventListener('scroll', adjust);
    window.addEventListener('orientationchange', () => setTimeout(adjust, 250));
    adjust();
  }

  // 🔧 MELHORIA: define o tamanho "padrão" do painel automaticamente
  // conforme o tipo de dispositivo (celular / tablet / desktop), sem
  // depender do usuário escolher — evita telas espremidas ou cortadas.
  function getDeviceTier(){
    const w = window.innerWidth;
    if(w <= 600) return 'phone';
    if(w <= 1024) return 'tablet';
    return 'desktop';
  }

  const EXPAND_KEY = 'odonto-ai-expanded';

  function initWidget(){
    const panel = document.getElementById('aiPanel');
    const toggleBtn = document.getElementById('aiToggleBtn');
    const closeBtn = document.getElementById('aiCloseBtn');
    const expandBtn = document.getElementById('aiExpandBtn');
    const input = document.getElementById('aiInput');
    const sendBtn = document.getElementById('aiSendBtn');
    const messages = document.getElementById('aiMessages');
    const subjectLabel = document.getElementById('aiSubjectLabel');

    if(!panel || !toggleBtn) return;

    setupKeyboardOffsetFix();
    document.documentElement.setAttribute('data-device-tier', getDeviceTier());
    window.addEventListener('resize', () => {
      document.documentElement.setAttribute('data-device-tier', getDeviceTier());
    });

    function updateSubjectLabel(){
      const subj = currentSubjectContext();
      subjectLabel.textContent = subj ? `lendo: ${subj.disciplina}` : 'nenhuma disciplina aberta';
    }

    function updateExpandIcon(){
      if(!expandBtn) return;
      const expanded = panel.classList.contains('expanded');
      expandBtn.innerHTML = expanded ? '&#8600;' : '&#8599;'; // seta pra dentro / pra fora
      expandBtn.setAttribute('aria-label', expanded ? 'Reduzir chat' : 'Expandir chat');
      expandBtn.title = expanded ? 'Reduzir chat' : 'Expandir chat (aba maior)';
    }

    // Aplica automaticamente um "padrão" de tamanho por dispositivo assim que
    // o painel abre. No celular ele já nasce ocupando a tela quase toda
    // (like um app de chat de verdade), no tablet/desktop nasce compacto,
    // com opção de expandir manualmente pelo botão ↗.
    function applyDefaultSizeForDevice(){
      const tier = getDeviceTier();
      if(tier === 'phone'){
        panel.classList.add('expanded');
      } else {
        const wantsExpanded = localStorage.getItem(EXPAND_KEY) === '1';
        panel.classList.toggle('expanded', wantsExpanded);
      }
      updateExpandIcon();
    }

    toggleBtn.onclick = () => {
      panel.classList.toggle('open');
      if(panel.classList.contains('open')){
        applyDefaultSizeForDevice();
        updateSubjectLabel();
        input.focus();
      }
    };
    closeBtn.onclick = () => panel.classList.remove('open');

    if(expandBtn){
      expandBtn.onclick = () => {
        const tier = getDeviceTier();
        const nowExpanded = panel.classList.toggle('expanded');
        updateExpandIcon();
        // No celular o painel já é sempre "cheio"; a preferência de expandir
        // só faz sentido salvar pra tablet/desktop.
        if(tier !== 'phone'){
          localStorage.setItem(EXPAND_KEY, nowExpanded ? '1' : '0');
        }
        input.focus();
      };
    }

    // 🔐 MELHORIA DE SEGURANÇA: o texto que chega aqui vem de uma API externa
    // (Gemini, via Worker). Antes, ele ia direto pro innerHTML só passando por
    // marked.parse() — se a resposta contivesse HTML/JS malicioso (por bug do
    // modelo, ou por alguém interceptando/adulterando a chamada ao Worker),
    // esse código executaria no navegador de quem estivesse usando o app.
    // Agora sanitizamos com DOMPurify, do mesmo jeito que já era feito para o
    // conteúdo de site-data.js — a resposta da IA nunca deveria ter tratamento
    // mais permissivo do que o conteúdo estático do próprio site.
    function renderMessageHTML(text){
      const rawHtml = (typeof marked !== 'undefined') ? marked.parse(text) : text;
      return window.DOMPurify ? DOMPurify.sanitize(rawHtml) : rawHtml;
    }

    function appendMessage(role, text){
      const div = document.createElement('div');
      div.className = 'ai-msg ' + (role === 'user' ? 'ai-msg-user' : 'ai-msg-model');
      div.innerHTML = renderMessageHTML(text);
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
      // 🎨 Fade + leve subida ao aparecer (defensivo: sem motion.js
      // carregado, a mensagem só aparece normal, sem animação).
      if(window.OdontoMotion && window.OdontoMotion.animateChatMessage){
        window.OdontoMotion.animateChatMessage(div);
      }
      return div;
    }

    function appendLoading(){
      const div = document.createElement('div');
      div.className = 'ai-msg ai-msg-model ai-msg-loading';
      div.id = 'aiLoadingMsg';
      // 🎨 Bolinhas pulsando (estilo WhatsApp/iMessage) em vez de texto
      // "digitando..." estático. Markup fixo e controlado por nós (não
      // vem de resposta de API), então não precisa de sanitização aqui.
      div.innerHTML = '<span class="ai-typing-dots"><span></span><span></span><span></span></span>';
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

      if(WORKER_URL === 'COLE_AQUI_A_URL_DO_SEU_WORKER'){
        appendMessage('user', text);
        input.value = '';
        input.style.height = 'auto';
        appendMessage('model', '⚠ O assistente ainda não foi conectado ao servidor. Peça pra quem configurou o site colar a URL do Worker no arquivo `assistant.js`.');
        return;
      }

      appendMessage('user', text);
      input.value = '';
      input.style.height = 'auto';
      isWaiting = true;
      sendBtn.disabled = true;
      appendLoading();

      try{
        const reply = await sendToAssistant(text);
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

    document.addEventListener('click', () => setTimeout(updateSubjectLabel, 50));
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
