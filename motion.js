/* ======================================================
   MOTION — Scroll suave (Lenis) + animações de entrada (GSAP)
   ======================================================
   Este arquivo é aditivo: ele NUNCA deve ser pré-requisito pra o site
   funcionar. Se o CDN do GSAP/Lenis falhar (sem internet no primeiro
   load, bloqueio de rede, etc.), tudo aqui cai de volta pro
   comportamento instantâneo de sempre — nada quebra.

   app.js chama window.OdontoMotion.* nos pontos certos (abrir
   disciplina, montar a lista lateral, atualizar a barra de progresso).
   Se este arquivo não carregar, essas chamadas são protegidas por
   `window.OdontoMotion && ...` no próprio app.js.
   ====================================================== */
(function(){
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.OdontoMotion = window.OdontoMotion || {};

  // ---------- Lenis: scroll suave ----------
  let lenis = null;

  function initLenis(){
    if(prefersReducedMotion || typeof Lenis === 'undefined') return;

    lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    if(typeof gsap !== 'undefined'){
      // usa o ticker do GSAP como fonte de sincronismo — evita ter 2 loops
      // de requestAnimationFrame rodando em paralelo (um do Lenis, outro
      // que o GSAP já usa internamente pras próprias animações)
      gsap.ticker.add((time) => { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time){
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
  }

  // Permite que outras partes do código peçam um scroll suave (ex: ao
  // clicar num item do sumário) sem precisar saber se o Lenis existe.
  window.OdontoMotion.scrollTo = function(target, opts){
    if(lenis){
      lenis.scrollTo(target, opts || {});
    } else if(target && typeof target !== 'number' && target.scrollIntoView){
      target.scrollIntoView({ behavior: 'smooth', ...(opts || {}) });
    } else {
      window.scrollTo({ top: typeof target === 'number' ? target : 0, behavior: 'smooth' });
    }
  };

  // ---------- GSAP: animação de entrada ao abrir uma disciplina ----------
  window.OdontoMotion.animateSubjectOpen = function(contentEl){
    if(prefersReducedMotion || typeof gsap === 'undefined' || !contentEl) return;
    gsap.fromTo(contentEl,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }
    );
  };

  // ---------- GSAP: entrada em cascata dos itens da lista lateral ----------
  window.OdontoMotion.animateNavList = function(navEl){
    if(prefersReducedMotion || typeof gsap === 'undefined' || !navEl) return;
    const items = navEl.querySelectorAll('.subject-item');
    if(!items.length) return;
    gsap.fromTo(items,
      { opacity: 0, x: -8 },
      { opacity: 1, x: 0, duration: 0.35, stagger: 0.02, ease: 'power1.out' }
    );
  };

  // ---------- GSAP: barra de progresso + contador animados ----------
  window.OdontoMotion.animateProgress = function(completed, total, fillEl, textEl){
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    if(prefersReducedMotion || typeof gsap === 'undefined'){
      if(fillEl) fillEl.style.width = percentage + '%';
      if(textEl) textEl.textContent = `${completed}/${total}`;
      return;
    }

    if(fillEl){
      gsap.to(fillEl, { width: percentage + '%', duration: 0.6, ease: 'power2.out' });
    }
    if(textEl){
      const counter = { val: 0 };
      gsap.to(counter, {
        val: completed,
        duration: 0.6,
        ease: 'power2.out',
        onUpdate: () => { textEl.textContent = `${Math.round(counter.val)}/${total}`; }
      });
    }
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initLenis);
  } else {
    initLenis();
  }
})();

