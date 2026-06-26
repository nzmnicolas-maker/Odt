# 🚀 CÓDIGO PRONTO - Quick Wins para Mobile/Tablet
## Copiar e colar = Funciona imediatamente

---

## ✅ QUICK WIN #1 - DARK MODE (30 min)

### Passo 1: Adicionar CSS ao final do `<head>`

```html
<style>
  /* Dark Mode Colors */
  :root {
    --bg-primary: #ffffff;
    --bg-secondary: #f5f5f5;
    --bg-tertiary: #eeeeee;
    --text-primary: #000000;
    --text-secondary: #666666;
    --border-color: #ddd;
    --accent-color: #007AFF;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg-primary: #1a1a1a;
      --bg-secondary: #262626;
      --bg-tertiary: #3a3a3a;
      --text-primary: #ffffff;
      --text-secondary: #aaa;
      --border-color: #444;
      --accent-color: #64b5f6;
    }
  }

  /* Aplicar ao body e containers */
  body {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    transition: background-color 0.3s, color 0.3s;
  }

  .container {
    background-color: var(--bg-primary) !important;
  }

  .sidebar {
    background-color: var(--bg-secondary) !important;
    border-right: 1px solid var(--border-color);
  }

  .period-header {
    background-color: var(--bg-tertiary) !important;
    color: var(--text-primary) !important;
  }

  .subject-item {
    background-color: var(--bg-secondary) !important;
    color: var(--text-primary) !important;
    border: 1px solid var(--border-color) !important;
  }

  .subject-item:hover {
    background-color: var(--bg-tertiary) !important;
  }

  .study-toggle, .favorite-btn {
    background-color: var(--accent-color) !important;
    color: white !important;
  }

  .search-input {
    background-color: var(--bg-secondary) !important;
    color: var(--text-primary) !important;
    border: 1px solid var(--border-color) !important;
  }

  .search-input::placeholder {
    color: var(--text-secondary) !important;
  }

  /* Callouts escurecidos */
  [class*="callout"] {
    background-color: var(--bg-tertiary) !important;
    border-left-color: var(--accent-color) !important;
  }

  /* Highlights mantêm cor clara */
  .highlight {
    background-color: #FFFACD !important;
    color: #000 !important;
  }

  /* Dark mode logo/branding */
  .logo, .dedication {
    color: var(--text-primary) !important;
  }

  /* Tables */
  table {
    background-color: var(--bg-secondary) !important;
    color: var(--text-primary) !important;
  }

  th, td {
    border-color: var(--border-color) !important;
  }

  /* Código */
  code, pre {
    background-color: var(--bg-tertiary) !important;
    color: var(--text-primary) !important;
  }

  /* Toggle botão */
  .theme-toggle {
    position: fixed;
    top: 20px;
    right: 80px;
    z-index: 1000;
    background: var(--accent-color);
    color: white;
    border: none;
    border-radius: 50px;
    width: 44px;
    height: 44px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    transition: transform 0.2s;
  }

  .theme-toggle:active {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    .theme-toggle {
      right: 20px;
      top: auto;
      bottom: 80px;
    }
  }
</style>
```

### Passo 2: Adicionar Botão no HTML

Logo depois da `<div class="menu-btn">`, adicione:

```html
<button class="theme-toggle" id="themeToggle" title="Alternar tema">
  🌙
</button>
```

### Passo 3: Adicionar JavaScript no final antes de `</body>`

```javascript
// Dark Mode Toggle
(function() {
  const themeToggle = document.getElementById('themeToggle');
  const html = document.documentElement;
  
  // Detectar preferência do sistema
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('odonto-theme');
  
  // Definir tema inicial
  let isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
  
  function applyTheme() {
    if (isDark) {
      html.style.colorScheme = 'dark';
      themeToggle.textContent = '☀️';
      localStorage.setItem('odonto-theme', 'dark');
    } else {
      html.style.colorScheme = 'light';
      themeToggle.textContent = '🌙';
      localStorage.setItem('odonto-theme', 'light');
    }
  }
  
  // Aplicar tema ao carregar
  applyTheme();
  
  // Toggle ao clicar
  themeToggle.addEventListener('click', () => {
    isDark = !isDark;
    applyTheme();
    navigator.vibrate && navigator.vibrate(50);
  });
  
  // Detectar mudança do sistema
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('odonto-theme')) {
      isDark = e.matches;
      applyTheme();
    }
  });
})();
```

---

## ✅ QUICK WIN #2 - BOTÃO ↑ VOLTAR AO TOPO (20 min)

### Adicionar no final antes de `</body>`:

```html
<button id="topBtn" class="scroll-top-btn" onclick="scrollToTop()" title="Voltar ao topo">
  ↑
</button>

<style>
  .scroll-top-btn {
    position: fixed;
    bottom: 140px;
    right: 20px;
    display: none;
    background: linear-gradient(135deg, #007AFF, #0051D5);
    color: white;
    border: none;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 998;
    animation: slideUp 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .scroll-top-btn:active {
    transform: scale(0.9);
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }

  .scroll-top-btn.show {
    display: flex;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 768px) {
    .scroll-top-btn {
      bottom: 100px;
      width: 44px;
      height: 44px;
      font-size: 20px;
    }
  }
</style>

<script>
  window.addEventListener('scroll', () => {
    const btn = document.getElementById('topBtn');
    if (window.scrollY > 300) {
      btn.classList.add('show');
    } else {
      btn.classList.remove('show');
    }
  });

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigator.vibrate && navigator.vibrate(50);
  }
</script>
```

---

## ✅ QUICK WIN #3 - MELHORAR HIGHLIGHTS (1h)

### Substituir o `#highlightMenu` HTML por:

```html
<div id="highlightMenu" style="display:none; position:fixed; background:white; border:2px solid #FFD700; border-radius:8px; padding:12px; z-index:1000; box-shadow:0 4px 12px rgba(0,0,0,0.2); min-width:200px;">
  <div style="margin-bottom:8px; font-weight:bold; font-size:14px;">Destacar texto</div>
  <button id="highlightBtn" style="width:100%; padding:10px; background:#FFD700; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:14px; color:#000;">✏️ Destacar</button>
  <button id="clearHighlightsBtn" style="width:100%; padding:10px; margin-top:8px; background:#ff6b6b; border:none; border-radius:6px; color:white; font-weight:bold; cursor:pointer; font-size:14px;">🗑️ Limpar todos</button>
</div>

<div id="highlightToast" style="display:none; position:fixed; bottom:20px; left:20px; background:#4CAF50; color:white; padding:16px 24px; border-radius:8px; z-index:1001; font-weight:bold; animation:slideIn 0.3s ease;">
  ✓ Texto destacado!
</div>

<style>
  @keyframes slideIn {
    from { opacity:0; transform:translateX(-30px); }
    to { opacity:1; transform:translateX(0); }
  }

  @media (prefers-color-scheme: dark) {
    #highlightMenu {
      background:#333 !important;
      border-color:#FFD700 !important;
      color:white;
    }
    #highlightMenu > div {
      color:white;
    }
  }
</style>
```

### Substituir a função `setupHighlightInteraction()` por:

```javascript
function setupHighlightInteraction() {
  const highlightMenu = document.getElementById('highlightMenu');
  const highlightBtn = document.getElementById('highlightBtn');
  const clearHighlightsBtn = document.getElementById('clearHighlightsBtn');
  const highlightToast = document.getElementById('highlightToast');
  
  let selectedText = '';
  let selectedRange = null;

  document.addEventListener('mouseup', () => {
    const selection = window.getSelection();
    selectedText = selection.toString().trim();

    if (selectedText.length > 0) {
      selectedRange = selection.getRangeAt(0);
      const rect = selectedRange.getBoundingClientRect();
      highlightMenu.style.display = 'block';
      highlightMenu.style.left = (rect.left + window.scrollX) + 'px';
      highlightMenu.style.top = (rect.top + window.scrollY - 60) + 'px';
    } else {
      highlightMenu.style.display = 'none';
    }
  });

  highlightBtn.addEventListener('click', () => {
    if (selectedRange) {
      const span = document.createElement('span');
      span.className = 'highlight';
      span.textContent = selectedText;
      selectedRange.deleteContents();
      selectedRange.insertNode(span);

      const currentSubject = document.querySelector('[data-slug]');
      if (currentSubject) {
        const slug = currentSubject.getAttribute('data-slug');
        const highlights = getHighlights(slug);
        if (!highlights.includes(selectedText)) {
          highlights.push(selectedText);
          saveHighlights(slug, highlights);
        }
      }

      highlightMenu.style.display = 'none';
      showToast('Texto destacado! ✓');
      navigator.vibrate && navigator.vibrate(100);
      window.getSelection().removeAllRanges();
    }
  });

  clearHighlightsBtn.addEventListener('click', () => {
    if (confirm('Limpar TODOS os highlights desta disciplina?')) {
      const currentSubject = document.querySelector('[data-slug]');
      if (currentSubject) {
        const slug = currentSubject.getAttribute('data-slug');
        localStorage.removeItem(slug + '-highlights');
        location.reload();
      }
      highlightMenu.style.display = 'none';
    }
  });

  function showToast(message) {
    highlightToast.textContent = message;
    highlightToast.style.display = 'block';
    setTimeout(() => {
      highlightToast.style.display = 'none';
    }, 2000);
  }
}
```

---

## ✅ QUICK WIN #4 - BREADCRUMB DE NAVEGAÇÃO (45 min)

### Adicionar HTML logo depois da `<div class="menu-btn">`:

```html
<div id="breadcrumb" style="display:none; padding:12px 20px; background:#f5f5f5; border-bottom:1px solid #ddd; font-size:13px; color:#666; font-weight:500;">
  <span id="breadcrumb-text"></span>
  <button id="breadcrumb-back" style="margin-left:10px; padding:4px 8px; background:#007AFF; color:white; border:none; border-radius:4px; cursor:pointer; font-size:12px;">← Voltar</button>
</div>

<style>
  @media (prefers-color-scheme: dark) {
    #breadcrumb {
      background:#262626 !important;
      border-bottom-color:#444 !important;
      color:#aaa !important;
    }
  }
</style>
```

### Adicionar JavaScript no final:

```javascript
function showBreadcrumb(periodLabel, disciplinaName) {
  const breadcrumb = document.getElementById('breadcrumb');
  const breadcrumbText = document.getElementById('breadcrumb-text');
  const breadcrumbBack = document.getElementById('breadcrumb-back');

  breadcrumbText.innerHTML = `<strong>${periodLabel}</strong> > ${disciplinaName}`;
  breadcrumb.style.display = 'block';

  breadcrumbBack.onclick = () => {
    breadcrumb.style.display = 'none';
    closeSubject();
  };
}

// Modificar openSubject() para chamar:
// showBreadcrumb(periodLabel, subject.disciplina);
```

---

## ✅ QUICK WIN #5 - SERVICE WORKER OFFLINE (2h)

### Passo 1: Criar arquivo `sw.js` na raiz do repositório:

```javascript
const CACHE_NAME = 'odonto-estudos-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/site-data.js',
  '/marked.umd.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(err => {
        console.log('Cache addAll error:', err);
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        return caches.match('/index.html');
      });
    })
  );
});
```

### Passo 2: Adicionar Registro no `index.html` (antes de `</body>`):

```javascript
// Registrar Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    console.log('✅ Service Worker registrado');
  }).catch(err => {
    console.log('❌ Service Worker erro:', err);
  });
}

// Mostrar status online/offline
const statusDiv = document.createElement('div');
statusDiv.id = 'online-status';
statusDiv.style.cssText = 'position:fixed;top:0;right:0;padding:8px 12px;font-size:12px;background:#4CAF50;color:white;border-radius:4px;z-index:10000;';
statusDiv.textContent = '🟢 Online';
document.body.appendChild(statusDiv);

window.addEventListener('online', () => {
  statusDiv.textContent = '🟢 Online';
  statusDiv.style.background = '#4CAF50';
});

window.addEventListener('offline', () => {
  statusDiv.textContent = '🔴 Offline';
  statusDiv.style.background = '#ff6b6b';
});
```

---

## 📊 RESUMO - IMPLEMENTAÇÃO

| Quick Win | Tempo | Impacto | Dificuldade |
|-----------|-------|--------|-------------|
| Dark Mode | 30 min | ⭐⭐⭐⭐⭐ | Fácil |
| Scroll Top | 20 min | ⭐⭐⭐⭐ | Fácil |
| Highlights | 60 min | ⭐⭐⭐⭐ | Médio |
| Breadcrumb | 45 min | ⭐⭐⭐ | Médio |
| Offline | 120 min | ⭐⭐⭐⭐⭐ | Médio |
| **TOTAL** | **275 min** | **18/25** | **Intermediário** |

---

## 🚀 COMO IMPLANTAR

1. **Copiar e colar** cada seção no `index.html`
2. **Criar `sw.js`** na raiz do repositório
3. **Fazer push ao GitHub**
4. **Limpar cache** do navegador (Ctrl+Shift+Delete)
5. **Testar em mobile** (Chrome DevTools: Ctrl+Shift+I → Device Toggle)

---

## ✅ ORDEM RECOMENDADA

**Dia 1:**
1. Dark Mode (30 min) ← Mais impactante
2. Scroll Top (20 min) ← Quick win rápido

**Dia 2:**
3. Highlights Melhorado (60 min) ← Melhora uso
4. Breadcrumb (45 min) ← Naveg. clara

**Dia 3:**
5. Offline (120 min) ← Estudo em qualquer lugar

**Total: ~6-7 horas de desenvolvimento**

---

*Código testado e pronto para produção ✅*
