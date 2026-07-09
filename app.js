(function(){
  const nav = document.getElementById('nav');
  const content = document.getElementById('content');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const menuBtn = document.getElementById('menuBtn');
  const topbarTitle = document.getElementById('topbarTitle');
  const searchInput = document.getElementById('searchInput');
  const themeToggle = document.getElementById('themeToggle');

  // ---------- Toast (substitui alert()) ----------
  let toastTimer = null;
  function showToast(msg, type){
    const el = document.getElementById('toast');
    if(!el) return;
    el.textContent = msg;
    el.className = 'toast show' + (type === 'error' ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.classList.remove('show'); }, 3200);
  }

  // ---------- Modal de confirmação (substitui confirm()) ----------
  function showConfirm(title, message, onConfirm){
    const overlayEl = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    overlayEl.classList.add('show');

    const confirmBtn = document.getElementById('modalConfirmBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');

    function cleanup(){
      overlayEl.classList.remove('show');
      confirmBtn.removeEventListener('click', onYes);
      cancelBtn.removeEventListener('click', onNo);
    }
    function onYes(){ cleanup(); onConfirm(); }
    function onNo(){ cleanup(); }

    confirmBtn.addEventListener('click', onYes);
    cancelBtn.addEventListener('click', onNo);
  }

  // ---------- Storage seguro com versionamento ----------
  const STORAGE_KEY = 'odonto-estudos-progresso';
  const STORAGE_VERSION = 2;

  function storageAvailable(){
    try{
      const t = '__odonto_test__';
      localStorage.setItem(t, '1');
      localStorage.removeItem(t);
      return true;
    }catch(e){
      return false;
    }
  }
  const hasStorage = storageAvailable();
  if(!hasStorage){
    showToast('⚠ Armazenamento local indisponível (modo privado?). Seu progresso não será salvo.', 'error');
  }

  let memoryFallback = {};

  function getProgress(){
    if(!hasStorage) return memoryFallback;
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return {};
      const parsed = JSON.parse(raw);
      // migração simples: dados antigos (sem _v) continuam funcionando como estão
      if(parsed && typeof parsed === 'object'){
        return parsed;
      }
      return {};
    }catch(e){
      console.warn('Progresso corrompido, iniciando do zero.', e);
      return {};
    }
  }
  function setProgress(p){
    p._v = STORAGE_VERSION;
    if(!hasStorage){ memoryFallback = p; return; }
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    }catch(e){
      showToast('⚠ Não foi possível salvar (armazenamento cheio ou bloqueado).', 'error');
    }
  }

  // --- MOTOR DO SISTEMA DE TEMAS (DARK MODE) ---
  let currentTheme = (hasStorage && localStorage.getItem('odonto-theme')) || 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

  themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    if(hasStorage) localStorage.setItem('odonto-theme', currentTheme);
    themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  });

  // --- MOTOR DO MODO LEITURA (tamanho de fonte, papel sépia, foco sem distrações) ---
  let readScale = (hasStorage && parseFloat(localStorage.getItem('odonto-read-scale'))) || 1;
  document.documentElement.style.setProperty('--read-scale', readScale);

  let paperMode = (hasStorage && localStorage.getItem('odonto-paper')) || '';
  if(paperMode === 'sepia'){ document.body.setAttribute('data-paper', 'sepia'); }

  let readingFocus = false;

  function syncReadToolbarUI(){
    const sepiaBtn = document.getElementById('sepiaBtn');
    const focusBtn = document.getElementById('focusBtn');
    if(sepiaBtn) sepiaBtn.classList.toggle('active', paperMode === 'sepia');
    if(focusBtn) focusBtn.classList.toggle('active', readingFocus);
  }

  function setReadScale(v){
    readScale = Math.min(1.5, Math.max(0.85, Math.round(v * 10) / 10));
    document.documentElement.style.setProperty('--read-scale', readScale);
    if(hasStorage) localStorage.setItem('odonto-read-scale', readScale);
  }

  function toggleSepia(){
    paperMode = paperMode === 'sepia' ? '' : 'sepia';
    if(paperMode === 'sepia'){
      document.body.setAttribute('data-paper', 'sepia');
    } else {
      document.body.removeAttribute('data-paper');
    }
    if(hasStorage) localStorage.setItem('odonto-paper', paperMode);
    syncReadToolbarUI();
  }

  function toggleFocus(){
    readingFocus = !readingFocus;
    document.documentElement.setAttribute('data-reading-focus', readingFocus ? '1' : '0');
    if(readingFocus) closeSidebarMobile();
    syncReadToolbarUI();
  }

  // --- MOTOR DO SUMÁRIO (TOC) DA DISCIPLINA ---
  let tocObserver = null;

  function buildToc(){
    const tocPanel = document.getElementById('tocPanel');
    if(!tocPanel) return;
    const headings = Array.from(document.querySelectorAll('.body-text h2, .body-text h3'));
    tocPanel.innerHTML = '';
    if(headings.length === 0){
      const h4 = document.createElement('h4');
      h4.textContent = 'Sumário';
      const p = document.createElement('p');
      p.style.cssText = 'font-family:var(--mono); font-size:12px; color:var(--graphite-soft); margin:0;';
      p.textContent = 'Nenhuma seção encontrada nesta disciplina.';
      tocPanel.append(h4, p);
      return;
    }
    const h4 = document.createElement('h4');
    h4.textContent = '☰ Sumário da disciplina';
    const ul = document.createElement('ul');
    ul.className = 'toc-list';
    ul.setAttribute('data-lenis-prevent', ''); // scroll interno próprio, não deve ser controlado pelo Lenis
    headings.forEach(h => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + h.id;
      if(h.tagName === 'H3') a.classList.add('toc-h3');
      a.dataset.target = h.id;
      a.textContent = h.textContent.replace('📌','').trim();
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(a.dataset.target);
        if(target) target.scrollIntoView({ behavior:'smooth', block:'start' });
        const tocBtn = document.getElementById('tocBtn');
        tocPanel.classList.remove('open');
        if(tocBtn) tocBtn.classList.remove('active');
      });
      li.appendChild(a);
      ul.appendChild(li);
    });
    tocPanel.append(h4, ul);

    if(tocObserver) tocObserver.disconnect();
    tocObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const link = tocPanel.querySelector(`a[data-target="${entry.target.id}"]`);
        if(!link) return;
        if(entry.isIntersecting){
          tocPanel.querySelectorAll('a').forEach(a => a.classList.remove('toc-active'));
          link.classList.add('toc-active');
        }
      });
    }, { rootMargin: '-15% 0px -70% 0px' });
    headings.forEach(h => tocObserver.observe(h));
  }

  function toggleToc(){
    const tocPanel = document.getElementById('tocPanel');
    const tocBtn = document.getElementById('tocBtn');
    if(!tocPanel) return;
    const isOpen = tocPanel.classList.toggle('open');
    if(tocBtn) tocBtn.classList.toggle('active', isOpen);
  }

  // --- MOTOR DE STREAK DE ESTUDO (dias consecutivos) ---
  const STREAK_KEY = 'odonto-estudo-dias';
  function registerStudyDay(){
    if(!hasStorage) return;
    const today = new Date().toISOString().slice(0,10);
    let days = [];
    try{ days = JSON.parse(localStorage.getItem(STREAK_KEY) || '[]'); }catch(e){ days = []; }
    if(!Array.isArray(days)) days = [];
    if(!days.includes(today)){
      days.push(today);
      // mantém só os últimos 400 dias pra não crescer pra sempre
      if(days.length > 400) days = days.slice(-400);
      localStorage.setItem(STREAK_KEY, JSON.stringify(days));
    }
    renderStreak();
  }
  function computeStreak(days){
    const set = new Set(days);
    let streak = 0;
    let cursor = new Date();
    while(true){
      const key = cursor.toISOString().slice(0,10);
      if(set.has(key)){
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }
  function renderStreak(){
    const el = document.getElementById('streakDisplay');
    if(!el || !hasStorage) return;
    let days = [];
    try{ days = JSON.parse(localStorage.getItem(STREAK_KEY) || '[]'); }catch(e){ days = []; }
    const streak = computeStreak(days);
    el.textContent = streak > 0 ? `🔥 ${streak} dia${streak > 1 ? 's' : ''} seguido${streak > 1 ? 's' : ''}` : 'comece hoje';
  }

  // --- MOTOR DE BACKUP ---
  document.getElementById('exportBtn').addEventListener('click', () => {
    try{
      const dataStr = JSON.stringify(getProgress(), null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = 'odonto_estudos_backup.json';
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      showToast('📤 Backup exportado com sucesso.');
    }catch(e){
      showToast('⚠ Não foi possível exportar o backup.', 'error');
    }
  });

  document.getElementById('importBtn').addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.onchange = e => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.readAsText(file,'UTF-8');
      reader.onload = readerEvent => {
        try {
          const importedData = JSON.parse(readerEvent.target.result);
          if(typeof importedData !== 'object' || importedData === null || Array.isArray(importedData)){
            throw new Error('formato inválido');
          }
          showConfirm(
            'Importar backup?',
            'Isso vai substituir todo o progresso salvo neste aparelho pelo conteúdo do arquivo. Essa ação não pode ser desfeita.',
            () => {
              setProgress(importedData);
              showToast('✅ Backup restaurado com sucesso!');
              setTimeout(() => window.location.reload(), 900);
            }
          );
        } catch(err) {
          showToast('⚠ Arquivo de backup inválido.', 'error');
        }
      };
    };
    fileInput.click();
  });

  // --- MOTOR DO TIMER POMODORO ---
  let timerInterval = null;
  let timerEndAt = null; // timestamp alvo, sobrevive a troca de aba/lock de tela
  let timeRemaining = 25 * 60;
  const timerDisplay = document.getElementById('timerDisplay');
  const startTimerBtn = document.getElementById('startTimerBtn');

  function updateTimerUI() {
    const clamped = Math.max(0, timeRemaining);
    const minutes = Math.floor(clamped / 60).toString().padStart(2, '0');
    const seconds = (clamped % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${minutes}:${seconds}`;
  }

  function tickTimer(){
    if(timerEndAt === null) return;
    // 🔧 MELHORIA: calcula o tempo restante a partir de um timestamp real
    // (Date.now()) em vez de só decrementar um contador. Isso evita o
    // "bug clássico" de mobile onde o navegador pausa setInterval quando
    // o app vai pro background/tela bloqueia, e o timer atrasa ou trava.
    timeRemaining = Math.round((timerEndAt - Date.now()) / 1000);
    if(timeRemaining <= 0){
      clearInterval(timerInterval);
      timerInterval = null;
      timerEndAt = null;
      timeRemaining = 25 * 60;
      startTimerBtn.textContent = 'Iniciar';
      updateTimerUI();
      showToast('⏰ Fim do bloco de foco! Hora de descansar um pouco.');
      return;
    }
    updateTimerUI();
  }

  startTimerBtn.addEventListener('click', () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
      timerEndAt = null;
      startTimerBtn.textContent = 'Iniciar';
    } else {
      timerEndAt = Date.now() + timeRemaining * 1000;
      startTimerBtn.textContent = 'Pausar';
      tickTimer();
      timerInterval = setInterval(tickTimer, 1000);
    }
  });

  document.getElementById('resetTimerBtn').addEventListener('click', () => {
    clearInterval(timerInterval);
    timerInterval = null;
    timerEndAt = null;
    timeRemaining = 25 * 60;
    startTimerBtn.textContent = 'Iniciar';
    updateTimerUI();
  });

  // recalcula o timer assim que a aba volta a ficar visível (corrige atraso
  // acumulado enquanto o celular estava com a tela apagada)
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible' && timerInterval){
      tickTimer();
    }
  });


  function updateProgressBar(){
    const progress = getProgress();
    let total = 0;
    let completed = 0;

    SITE_DATA.forEach(periodObj => {
      periodObj.subjects.forEach(s => {
        total++;
        if(progress[s.slug]) completed++;
      });
    });

    const fillEl = document.getElementById('progressFill');
    const textEl = document.getElementById('progressText');

    // 🎨 Se motion.js (GSAP) carregou, anima a barra/contador; senão cai
    // no comportamento instantâneo de sempre (defensivo — sem internet
    // no primeiro load, ou CDN bloqueado, o site continua funcionando).
    if(window.OdontoMotion && window.OdontoMotion.animateProgress){
      window.OdontoMotion.animateProgress(completed, total, fillEl, textEl);
    } else {
      const percentage = total > 0 ? (completed / total) * 100 : 0;
      if(textEl) textEl.textContent = `${completed}/${total}`;
      if(fillEl) fillEl.style.width = percentage + '%';
    }
  }

  let activeSlug = null;

  // ---------- Sistema de destaque (highlight) baseado em Range/TreeWalker ----------
  // A versão baseada em regex direto no innerHTML podia casar texto dentro de
  // atributos/tags e quebrar o HTML, além de duplicar marcações sobrepostas.
  // Usamos Range real do DOM, que é seguro mesmo com HTML complexo (tabelas,
  // listas, negrito, etc).

  function saveHighlights(slug, highlights){
    const p = getProgress();
    p[slug + '-highlights'] = highlights;
    setProgress(p);
  }

  function getHighlights(slug){
    const p = getProgress();
    const h = p[slug + '-highlights'];
    return Array.isArray(h) ? h : [];
  }

  // 🔧 MELHORIA DE PERFORMANCE: a versão anterior recomeçava o TreeWalker do
  // zero a cada ocorrência encontrada (O(n²) em textos com muitos matches).
  // Agora percorremos a árvore UMA vez para localizar os nós candidatos, e
  // dentro de cada nó tratamos múltiplas ocorrências sem reiniciar o walker —
  // mesmo resultado, muito menos trabalho repetido em textos longos.
  function wrapAllOccurrences(text){
    if(!text) return 0;
    const bodyText = document.querySelector('.body-text');
    if(!bodyText) return 0;
    const lowerText = text.toLowerCase();
    let wrapped = 0;

    const walker = document.createTreeWalker(bodyText, NodeFilter.SHOW_TEXT, {
      acceptNode(node){
        // não marca de novo texto que já está dentro de um highlight existente
        if(node.parentElement && node.parentElement.closest('.highlight')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    // 1ª passada (sem mutar o DOM): junta só os nós que realmente contêm o termo
    const candidateNodes = [];
    let node;
    while(node = walker.nextNode()){
      if(node.nodeValue.toLowerCase().includes(lowerText)) candidateNodes.push(node);
    }

    // 2ª passada: para cada nó candidato, envolve todas as ocorrências dentro dele
    candidateNodes.forEach(textNode => {
      let currentNode = textNode;
      while(currentNode && currentNode.nodeValue){
        const idx = currentNode.nodeValue.toLowerCase().indexOf(lowerText);
        if(idx === -1) break;
        try{
          const range = document.createRange();
          range.setStart(currentNode, idx);
          range.setEnd(currentNode, idx + text.length);
          const span = document.createElement('span');
          span.className = 'highlight';
          span.dataset.text = text;
          range.surroundContents(span);
          wrapped++;
          // o texto restante após o match (se houver) fica no nextSibling do span
          const after = span.nextSibling;
          currentNode = (after && after.nodeType === Node.TEXT_NODE) ? after : null;
        }catch(err){
          // range cruza limite de elemento (ex: metade em <strong>), pula esse nó
          break;
        }
      }
    });

    return wrapped;
  }

  function restoreHighlights(slug){
    const highlights = getHighlights(slug);
    highlights.forEach(h => wrapAllOccurrences(h));
    setupHighlightInteraction();
  }

  function removeHighlightSpan(span){
    const parent = span.parentNode;
    while(span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
    parent.normalize();
  }

  function setupHighlightInteraction(){
    document.querySelectorAll('.highlight').forEach(h => {
      h.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('highlightMenu');
        const rect = h.getBoundingClientRect();
        menu.style.left = (rect.left + window.scrollX) + 'px';
        menu.style.top = (rect.top + window.scrollY - 44) + 'px';
        menu.classList.add('show');
        document.getElementById('highlightBtn').style.display = 'none';
        document.getElementById('removeHighlightBtn').style.display = 'inline-block';
        menu.dataset.mode = 'remove';
        menu.dataset.text = h.dataset.text || h.textContent;
      });
    });
  }

  document.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    if(text.length > 0){
      const menu = document.getElementById('highlightMenu');
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      menu.style.left = (rect.left + window.scrollX) + 'px';
      menu.style.top = (rect.top + window.scrollY - 44) + 'px';
      menu.classList.add('show');
      document.getElementById('highlightBtn').style.display = 'inline-block';
      document.getElementById('removeHighlightBtn').style.display = 'none';
      menu.dataset.mode = 'add';
      menu.dataset.text = text;
    }
  });

  document.getElementById('highlightBtn').addEventListener('click', () => {
    const menu = document.getElementById('highlightMenu');
    const selectedText = menu.dataset.text;
    if(!selectedText || !activeSlug) return;

    const wrapped = wrapAllOccurrences(selectedText);
    if(wrapped > 0){
      const highlights = getHighlights(activeSlug);
      if(!highlights.includes(selectedText)){
        highlights.push(selectedText);
        saveHighlights(activeSlug, highlights);
      }
      setupHighlightInteraction();
    }

    menu.classList.remove('show');
    window.getSelection().removeAllRanges();
  });

  document.getElementById('removeHighlightBtn').addEventListener('click', () => {
    const menu = document.getElementById('highlightMenu');
    const text = menu.dataset.text;
    if(!text || !activeSlug) return;

    document.querySelectorAll('.highlight').forEach(span => {
      if((span.dataset.text || span.textContent) === text){
        removeHighlightSpan(span);
      }
    });

    const highlights = getHighlights(activeSlug).filter(h => h !== text);
    saveHighlights(activeSlug, highlights);

    menu.classList.remove('show');
  });

  document.addEventListener('click', (e) => {
    if(!e.target.closest('.highlight-menu') && !e.target.closest('.highlight')){
      document.getElementById('highlightMenu').classList.remove('show');
    }
  });

  // --- ARQUITETURA DE MARCAÇÃO DE TÓPICOS INTERNOS OTIMIZADA PARA TOUCH SCRENS (📌) ---
  function setupTopicBookmarks(slug) {
    const headings = document.querySelectorAll('.body-text h2, .body-text h3');
    const summaryContainer = document.getElementById('pinnedSummaryContainer');

    function updateSummaryUI() {
      const currentProgress = getProgress();
      const currentPinned = currentProgress[slug + '-pinned-headings'] || [];

      summaryContainer.innerHTML = '';
      if (currentPinned.length === 0) {
        summaryContainer.style.display = 'none';
        return;
      }

      summaryContainer.style.display = 'block';
      const wrap = document.createElement('div');
      wrap.className = 'pinned-topics-summary';
      const h4 = document.createElement('h4');
      h4.textContent = '📌 Tópicos Importantes Destacados';
      const ul = document.createElement('ul');
      ul.className = 'pinned-topics-list';
      currentPinned.forEach(item => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'pinned-topic-link';
        a.dataset.target = item.id;
        a.textContent = '📌 ' + item.text;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const targetEl = document.getElementById(item.id);
          if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        li.appendChild(a);
        ul.appendChild(li);
      });
      wrap.append(h4, ul);
      summaryContainer.appendChild(wrap);
    }

    headings.forEach((heading, index) => {
      const headingId = `heading-${slug}-${index}`;
      heading.id = headingId;
      heading.style.position = 'relative';

      const pinBtn = document.createElement('button');
      pinBtn.className = 'pin-topic-btn';
      pinBtn.innerHTML = '📌';
      pinBtn.title = 'Marcar este tópico como importante';
      pinBtn.setAttribute('aria-label', 'Marcar este tópico como importante');

      const p = getProgress();
      const pinnedList = p[slug + '-pinned-headings'] || [];
      const isPinned = pinnedList.some(item => item.id === headingId);

      if (isPinned) {
        pinBtn.classList.add('pinned');
        heading.classList.add('topic-pinned');
      }

      heading.appendChild(pinBtn);

      pinBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentProgress = getProgress();
        let currentPinned = currentProgress[slug + '-pinned-headings'] || [];
        const alreadyPinnedIndex = currentPinned.findIndex(item => item.id === headingId);

        if (alreadyPinnedIndex > -1) {
          currentPinned.splice(alreadyPinnedIndex, 1);
          pinBtn.classList.remove('pinned');
          heading.classList.remove('topic-pinned');
        } else {
          currentPinned.push({
            id: headingId,
            text: heading.textContent.replace('📌', '').trim(),
            tag: heading.tagName
          });
          pinBtn.classList.add('pinned');
          heading.classList.add('topic-pinned');
        }

        currentProgress[slug + '-pinned-headings'] = currentPinned;
        setProgress(currentProgress);
        updateSummaryUI();
      });
    });

    updateSummaryUI();
  }

  function normalizeText(str){
    return (str || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // remove acentos p/ busca mais tolerante
  }

  function subjectMatchesSearch(s, ft){
    if(!ft) return true;
    const haystacks = [
      s.disciplina,
      s.codigo,
      s.periodo,
      s.carga_horaria,
      s.body
    ];
    return haystacks.some(field => normalizeText(field).includes(ft));
  }

  /* 🔧 MELHORIA: pega um pedacinho do TEXTO da matéria (não do título) onde o termo
     buscado aparece, pra mostrar na lista lateral por que aquela disciplina apareceu.
     Construído via DOM (não innerHTML) pra evitar qualquer risco de injeção. */
  function buildSearchSnippetNode(s, ft){
    if(!ft) return null;
    if(normalizeText(s.disciplina).includes(ft)) return null; // já bateu pelo nome, não precisa de trecho
    const rawBody = (s.body || '').toString();
    const nBody = normalizeText(rawBody);
    const idx = nBody.indexOf(ft);
    if(idx === -1) return null;
    const start = Math.max(0, idx - 45);
    const end = Math.min(rawBody.length, idx + ft.length + 70);
    let snippet = rawBody.substring(start, end)
      .replace(/[#*_>`\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const nSnippet = normalizeText(snippet);
    const mIdx = nSnippet.indexOf(ft);

    const wrap = document.createElement('div');
    wrap.className = 'search-snippet';
    if(start > 0) wrap.appendChild(document.createTextNode('…'));
    if(mIdx === -1){
      wrap.appendChild(document.createTextNode(snippet));
    } else {
      wrap.appendChild(document.createTextNode(snippet.slice(0, mIdx)));
      const mark = document.createElement('mark');
      mark.textContent = snippet.slice(mIdx, mIdx + ft.length);
      wrap.appendChild(mark);
      wrap.appendChild(document.createTextNode(snippet.slice(mIdx + ft.length)));
    }
    if(end < rawBody.length) wrap.appendChild(document.createTextNode('…'));
    return wrap;
  }

  /* 🔧 MELHORIA: rola a página até o trecho exato do texto que combina com a busca
     e dá um destaque temporário nele, pra não precisar ler a matéria inteira procurando */
  function highlightAndScrollToSearch(term){
    if(!term) return;
    const bodyText = document.querySelector('.body-text');
    if(!bodyText) return;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    const walker = document.createTreeWalker(bodyText, NodeFilter.SHOW_TEXT, null);
    let node;
    while(node = walker.nextNode()){
      const match = node.nodeValue.match(regex);
      if(match){
        const idx = match.index;
        try{
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + match[0].length);
          const span = document.createElement('span');
          span.className = 'search-jump-hit';
          range.surroundContents(span);
          span.scrollIntoView({ behavior:'smooth', block:'center' });
          setTimeout(() => { span.classList.remove('search-jump-hit'); }, 2800);
        }catch(err){ /* se não der pra envolver o trecho, ignora silenciosamente */ }
        break;
      }
    }
  }

  function buildNav(filterText){
    nav.innerHTML = '';
    const progress = getProgress();
    const ft = normalizeText(filterText||'').trim();

    SITE_DATA.forEach(periodObj => {
      const subjects = periodObj.subjects.filter(s => subjectMatchesSearch(s, ft));
      if(ft && subjects.length === 0) return;

      const group = document.createElement('div');
      group.className = 'period-group';

      const toggle = document.createElement('button');
      toggle.className = 'period-toggle';
      const labelSpan = document.createElement('span');
      labelSpan.textContent = periodObj.label;
      const chevSpan = document.createElement('span');
      chevSpan.className = 'chev';
      chevSpan.textContent = '▾';
      toggle.append(labelSpan, chevSpan);
      toggle.onclick = () => group.classList.toggle('collapsed');
      group.appendChild(toggle);

      const list = document.createElement('ul');
      list.className = 'subject-list';

      subjects.forEach(s => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.className = 'subject-item' + (s.slug === activeSlug ? ' active' : '') + (progress[s.slug] ? ' done' : '') + (progress[s.slug + '-favorited'] ? ' favorited' : '');

        const nameSpan = document.createElement('span');
        nameSpan.textContent = s.disciplina;
        const codeSpan = document.createElement('span');
        codeSpan.className = 'code';
        codeSpan.textContent = s.codigo || '';
        const checkSpan = document.createElement('span');
        checkSpan.className = 'check';
        checkSpan.textContent = '✓';
        const starSpan = document.createElement('span');
        starSpan.className = 'star';
        starSpan.textContent = '⭐';
        btn.append(nameSpan, codeSpan, checkSpan, starSpan);
        btn.onclick = () => openSubject(s, ft);
        li.appendChild(btn);

        /* 🔧 MELHORIA: se o motivo do resultado foi o TEXTO da matéria (não o nome),
           mostra o trecho embaixo pra já saber se é aquilo que procurava */
        const snippetNode = ft ? buildSearchSnippetNode(s, ft) : null;
        if(snippetNode){
          snippetNode.onclick = () => openSubject(s, ft);
          li.appendChild(snippetNode);
        }

        list.appendChild(li);
      });

      group.appendChild(list);
      nav.appendChild(group);
    });

    // 🎨 Entrada em cascata dos itens da lista (defensivo: se motion.js
    // não carregou, essa chamada simplesmente não faz nada).
    if(window.OdontoMotion && window.OdontoMotion.animateNavList){
      window.OdontoMotion.animateNavList(nav);
    }

    updateProgressBar();
  }

  function preprocessCallouts(md){
    const lines = md.split('\n');
    let out = [];
    let i = 0;
    while(i < lines.length){
      const m = lines[i].match(/^>\s*\[!(\w+)\]\s*(.*)$/);
      if(m){
        const type = m[1].toLowerCase();
        const title = m[2].trim();
        let body = [];
        i++;
        while(i < lines.length && /^>/.test(lines[i])){
          body.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        const cls = type === 'warning' ? 'warning' : (type === 'tip' ? 'tip' : 'info');
        const icon = cls === 'warning' ? '⚠' : (cls === 'tip' ? '✓' : 'i');
        // 🔐 sanitiza o HTML gerado pelo markdown antes de embuti-lo, já que o
        // conteúdo pode em tese vir de um arquivo de dados editável.
        const innerHtml = window.DOMPurify ? DOMPurify.sanitize(marked.parse(body.join('\n'))) : marked.parse(body.join('\n'));
        out.push(`<div class="callout ${cls}"><div class="callout-title">${icon} ${title}</div>${innerHtml}</div>`);
      } else {
        out.push(lines[i]);
        i++;
      }
    }
    return out.join('\n');
  }

  // ---------- 🔧 REFATORAÇÃO: openSubject() estava fazendo tudo de uma vez
  // (montar HTML, ligar 6+ listeners, atualizar sidebar, TOC, highlights, pins).
  // Agora ela só orquestra; cada responsabilidade vive na sua própria função,
  // o que deixa mais fácil entender/alterar cada parte isoladamente.

  function renderSubjectHeaderHTML(s, done, isFavorited, readMinutes){
    return `
      <div class="stamp">
        <div class="stamp-row">
          <span>código <b>${s.codigo || '—'}</b></span>
          <span>carga <b>${s.carga_horaria || '—'}</b></span>
          <span>nível <b>${s.periodo || '—'}</b></span>
          <span class="reading-time-pill">⏱ ~${readMinutes} min de leitura</span>
        </div>
        <h1>${s.disciplina}</h1>
        <div class="stamp-meta-row">
          <div class="stamp-actions">
            <button class="study-toggle ${done ? 'done' : ''}" id="studyBtn">
              ${done ? '✓ Estudada' : 'Marcar como estudada'}
            </button>
            <button class="favorite-toggle ${isFavorited ? 'favorited' : ''}" id="favoriteBtn">
              ${isFavorited ? '⭐ Favorita' : '☆ Favoritar'}
            </button>
          </div>
          <div class="read-toolbar">
            <button class="read-btn icon-btn" id="tocBtn" title="Sumário da disciplina" aria-label="Abrir sumário">☰ <span class="btn-label">Sumário</span></button>
            <div class="read-toolbar-group" role="group" aria-label="Tamanho do texto">
              <button class="read-btn" id="fontDownBtn" title="Diminuir texto" aria-label="Diminuir texto">A−</button>
              <button class="read-btn" id="fontResetBtn" title="Tamanho padrão" aria-label="Tamanho padrão">A</button>
              <button class="read-btn" id="fontUpBtn" title="Aumentar texto" aria-label="Aumentar texto">A+</button>
            </div>
            <button class="read-btn icon-btn" id="sepiaBtn" title="Papel sépia" aria-label="Alternar papel sépia">📄 <span class="btn-label">Sépia</span></button>
            <button class="read-btn icon-btn" id="focusBtn" title="Modo leitura sem distrações" aria-label="Alternar modo foco">🔎 <span class="btn-label">Foco</span></button>
            <button class="read-btn icon-btn" id="printBtn" title="Imprimir / exportar PDF" aria-label="Imprimir ou exportar em PDF">🖨️ <span class="btn-label">PDF</span></button>
          </div>
        </div>
      </div>
      <div class="toc-wrap">
        <div class="toc-panel" id="tocPanel"></div>
      </div>
      <div id="pinnedSummaryContainer" style="display:none;"></div>
    `;
  }

  function renderSubjectContent(s){
    const calloutHtml = preprocessCallouts(s.body);
    const rawHtml = marked.parse(calloutHtml, { gfm: true, breaks: false });
    // 🔐 sanitiza o HTML final do conteúdo da disciplina com DOMPurify antes de
    // inserir no DOM, evitando XSS caso o conteúdo em site-data.js algum dia
    // venha de uma fonte editável/externa.
    const htmlBody = window.DOMPurify ? DOMPurify.sanitize(rawHtml) : rawHtml;

    const wordCount = (s.body || '').toString().trim().split(/\s+/).filter(Boolean).length;
    const readMinutes = Math.max(1, Math.round(wordCount / 200));

    const progress = getProgress();
    const done = !!progress[s.slug];
    const isFavorited = !!progress[s.slug + '-favorited'];

    content.innerHTML = renderSubjectHeaderHTML(s, done, isFavorited, readMinutes)
      + `<div class="body-text">${htmlBody}</div>`;
  }

  function bindSubjectHeaderActions(s, searchTerm){
    document.getElementById('studyBtn').onclick = () => {
      const p = getProgress();
      p[s.slug] = !p[s.slug];
      setProgress(p);
      openSubject(s);
      buildNav(searchInput.value);
    };

    document.getElementById('favoriteBtn').onclick = () => {
      const p = getProgress();
      p[s.slug + '-favorited'] = !p[s.slug + '-favorited'];
      setProgress(p);
      openSubject(s);
      buildNav(searchInput.value);
    };

    document.getElementById('fontDownBtn').onclick = () => setReadScale(readScale - 0.1);
    document.getElementById('fontUpBtn').onclick = () => setReadScale(readScale + 0.1);
    document.getElementById('fontResetBtn').onclick = () => setReadScale(1);
    document.getElementById('sepiaBtn').onclick = toggleSepia;
    document.getElementById('focusBtn').onclick = toggleFocus;
    document.getElementById('printBtn').onclick = () => window.print();
    document.getElementById('tocBtn').onclick = toggleToc;
    syncReadToolbarUI();
  }

  function jumpToSearchTermIfNeeded(searchTerm){
    if(searchTerm){
      window.scrollTo(0,0);
      setTimeout(() => highlightAndScrollToSearch(searchTerm), 60);
    } else {
      window.scrollTo(0,0);
    }
  }

  function openSubject(s, searchTerm){
    activeSlug = s.slug;
    window.currentOpenSubject = s;

    renderSubjectContent(s);

    // 🎨 Fade + leve deslize ao trocar de disciplina (defensivo: sem
    // motion.js carregado, o conteúdo só aparece normal, sem animação).
    if(window.OdontoMotion && window.OdontoMotion.animateSubjectOpen){
      window.OdontoMotion.animateSubjectOpen(content);
    }

    bindSubjectHeaderActions(s, searchTerm);

    topbarTitle.textContent = s.disciplina;
    buildNav(searchInput.value);
    closeSidebarMobile();
    registerStudyDay();

    jumpToSearchTermIfNeeded(searchTerm);

    restoreHighlights(s.slug);
    setupTopicBookmarks(s.slug);
    buildToc();
  }

  function closeSidebarMobile(){
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  }

  menuBtn.onclick = () => {
    sidebar.classList.add('open');
    overlay.classList.add('show');
  };
  overlay.onclick = closeSidebarMobile;

  // 🔧 MELHORIA: debounce na busca — evita reconstruir a lista inteira
  // (e rodar a busca em TODOS os textos) a cada tecla digitada, o que
  // em celulares mais fracos causava engasgo visível ao digitar rápido.
  let searchDebounce = null;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    const val = e.target.value;
    searchDebounce = setTimeout(() => buildNav(val), 150);
  });

  buildNav('');
  renderStreak();

  // expõe utilitários pro assistant.js usar (toast de erro, por exemplo)
  window.OdontoUI = { showToast, showConfirm };
})();
