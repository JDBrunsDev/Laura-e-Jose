/* ===========================================================================
   LAURA & JOSÉ — SCRIPT
   ---------------------------------------------------------------------------
   Organização:
     CONFIG            → dados que você pode precisar trocar (WhatsApp, endereço…)
     initMenuMobile()  → abre/fecha o menu hamburguer
     initCabecalho()   → muda o header ao rolar
     initAnimacoes()   → entrada dos elementos ao rolar (IntersectionObserver)
     initImagens()     → carregamento/lazy + fallback das fotos
     initCarrosseis()  → carrosséis (trajes e galeria) — componente reutilizável
     initCopiarEndereco()
     initConfirmacao() → monta a mensagem e abre o WhatsApp
     mostrarToast()    → aviso flutuante ao usuário
   =========================================================================== */

(() => {
  'use strict';

  /* =========================================================================
     CONFIG  ·  TROQUE AQUI AS INFORMAÇÕES SENSÍVEIS
     ========================================================================= */
  const CONFIG = {
    /* TROCAR NÚMERO DO WHATSAPP: somente dígitos, com DDI (55) e DDD.
       Atenção: confirme este número antes de divulgar o site. */
    whatsapp: '5547991120083',

    /* TROCAR ENDEREÇO usado no botão "Copiar endereço" */
    endereco: 'R. Dorval Luz, 183 — Brusque/SC, CEP 88352-402 (Arte & Gula)',

    /* TROCAR MENSAGEM DE CONFIRMAÇÃO enviada ao WhatsApp.
       Os marcadores {nome}, {acompanhantes} e {observacoes} são preenchidos pelo formulário. */
    mensagemConfirmacao:
      'Olá, tudo bem?\n\n' +
      'Estou entrando em contato através do site do casamento de Laura e José para confirmar minha presença.\n\n' +
      'Nome:\n{nome}\n\n' +
      'Quantidade de acompanhantes:\n{acompanhantes}\n\n' +
      'Observações:\n{observacoes}\n\n' +
      'Aguardo a confirmação da presença.\n\nObrigado(a)!',

    /* Texto do toast após enviar a confirmação */
    avisoConfirmacao:
      'Sua solicitação de presença foi enviada com sucesso. ' +
      'A confirmação será analisada pelos anfitriões e respondida em até 48 horas.',

    /* TROCAR DATA DO EVENTO (contagem regressiva). Fuso de Brasília (-03:00). */
    dataEvento: '2026-11-15T16:00:00-03:00',

    /* Mensagem da confirmação "presenteei" (lista de presentes).
       {nome}, {valor}, {cota} e {mensagem} são preenchidos automaticamente. */
    mensagemPresente:
      'Olá! Aqui é {nome}. 💚\n\n' +
      'Presenteamos vocês com R$ {valor} ({cota}) para o casamento de Laura e José.\n\n' +
      '{mensagem}Que Deus abençoe essa nova caminhada!',
  };

  /* =========================================================================
     UTIL
     ========================================================================= */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const prefereReduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================================
     MENU MOBILE
     ========================================================================= */
  /** Abre/fecha o menu hamburguer e controla overlay + acessibilidade. */
  function initMenuMobile() {
    const botao   = $('[data-menu-toggle]');
    const nav     = $('.cabecalho__nav');
    const menu    = $('[data-menu]');
    const overlay = $('[data-menu-overlay]');
    if (!botao || !nav || !overlay) return;

    /** @param {boolean} abrir */
    const alternar = (abrir) => {
      nav.classList.toggle('is-aberto', abrir);
      botao.classList.toggle('is-aberto', abrir);
      botao.setAttribute('aria-expanded', String(abrir));
      botao.setAttribute('aria-label', abrir ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
      overlay.hidden = !abrir;
      // dispara a transição de opacidade no próximo frame
      requestAnimationFrame(() => overlay.classList.toggle('is-visivel', abrir));
      document.body.style.overflow = abrir ? 'hidden' : '';
    };

    botao.addEventListener('click', () => alternar(!nav.classList.contains('is-aberto')));
    overlay.addEventListener('click', () => alternar(false));
    // fecha ao clicar em um link do menu
    menu && $$('.menu__link', menu).forEach((link) => link.addEventListener('click', () => alternar(false)));
    // fecha com ESC
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') alternar(false); });
  }

  /* =========================================================================
     CABEÇALHO AO ROLAR
     ========================================================================= */
  /** Adiciona a classe .is-rolado ao header depois de um pequeno scroll. */
  function initCabecalho() {
    const cabecalho = $('[data-cabecalho]');
    if (!cabecalho) return;
    const atualizar = () => cabecalho.classList.toggle('is-rolado', window.scrollY > 60);
    atualizar();
    window.addEventListener('scroll', atualizar, { passive: true });
  }

  /* =========================================================================
     ANIMAÇÕES AO ROLAR (IntersectionObserver)
     ========================================================================= */
  /** Revela elementos [data-animar] quando entram na viewport. */
  function initAnimacoes() {
    const alvos = $$('[data-animar]');
    if (prefereReduzirMovimento || !('IntersectionObserver' in window)) {
      alvos.forEach((el) => el.classList.add('is-visivel'));
      return;
    }
    const observador = new IntersectionObserver((entradas, obs) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('is-visivel');
          obs.unobserve(entrada.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    alvos.forEach((el) => observador.observe(el));
  }

  /* =========================================================================
     IMAGENS — fade-in ao carregar + fallback de placeholder
     (o carregamento preguiçoso é nativo, via loading="lazy" no HTML)
     ========================================================================= */
  /** Revela cada foto com um fade suave quando carrega; se faltar, mantém o placeholder. */
  function initImagens() {
    const revelar = (img) => img.classList.add('is-carregada');
    $$('img.moldura__img').forEach((img) => {
      // Já carregada (cache) → revela na hora.
      if (img.complete && img.naturalWidth > 0) { revelar(img); return; }
      img.addEventListener('load', () => revelar(img), { once: true });
      // Erro (foto ainda não adicionada) → placeholder elegante continua visível.
      img.addEventListener('error', () => img.classList.remove('is-carregada'), { once: true });
    });
  }

  /* =========================================================================
     CARROSSEL — componente reutilizável
     Usado nos trajes (masc/fem) e na galeria. Suporta:
     setas, dots, swipe (mobile), teclado e redimensionamento.
     ========================================================================= */
  /**
   * Inicializa um carrossel a partir do elemento raiz [data-carrossel].
   * @param {HTMLElement} raiz
   */
  function criarCarrossel(raiz) {
    const trilho = $('[data-carrossel-trilho]', raiz);
    const slides = $$('.carrossel__slide', trilho);
    const btnAnt = $('[data-carrossel-ant]', raiz);
    const btnProx = $('[data-carrossel-prox]', raiz);
    const dotsBox = $('[data-carrossel-dots]', raiz);
    if (!trilho || slides.length === 0) return;

    let indice = 0;

    /** Gera os indicadores (dots). */
    const montarDots = () => {
      if (!dotsBox) return;
      dotsBox.innerHTML = '';
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'carrossel__dot';
        dot.setAttribute('aria-label', `Ir para a foto ${i + 1}`);
        dot.addEventListener('click', () => irPara(i));
        dotsBox.appendChild(dot);
      });
    };

    /** Atualiza a posição do trilho e o estado dos dots. */
    const atualizar = () => {
      trilho.style.transform = `translateX(-${indice * 100}%)`;
      if (dotsBox) $$('.carrossel__dot', dotsBox).forEach((d, i) => d.classList.toggle('is-ativo', i === indice));
    };

    /** @param {number} i */
    const irPara = (i) => { indice = (i + slides.length) % slides.length; atualizar(); };
    const proximo = () => irPara(indice + 1);
    const anterior = () => irPara(indice - 1);

    btnProx && btnProx.addEventListener('click', proximo);
    btnAnt  && btnAnt.addEventListener('click', anterior);

    // Navegação por teclado quando o carrossel está focado
    raiz.setAttribute('tabindex', '0');
    raiz.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); proximo(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); anterior(); }
    });

    // Swipe no mobile (toque)
    let xInicial = null;
    trilho.addEventListener('touchstart', (e) => { xInicial = e.touches[0].clientX; }, { passive: true });
    trilho.addEventListener('touchend', (e) => {
      if (xInicial === null) return;
      const delta = e.changedTouches[0].clientX - xInicial;
      if (Math.abs(delta) > 45) (delta < 0 ? proximo : anterior)();
      xInicial = null;
    }, { passive: true });

    montarDots();
    atualizar();
  }

  /** Inicializa todos os carrosséis da página. */
  function initCarrosseis() { $$('[data-carrossel]').forEach(criarCarrossel); }

  /* =========================================================================
     COPIAR ENDEREÇO
     ========================================================================= */
  /** Copia CONFIG.endereco para a área de transferência e mostra um toast. */
  function initCopiarEndereco() {
    $$('[data-copiar-endereco]').forEach((botao) => {
      botao.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(CONFIG.endereco);
          mostrarToast('Endereço copiado para a área de transferência.');
        } catch {
          // Fallback para navegadores sem clipboard API
          const area = document.createElement('textarea');
          area.value = CONFIG.endereco;
          document.body.appendChild(area);
          area.select();
          document.execCommand('copy');
          document.body.removeChild(area);
          mostrarToast('Endereço copiado.');
        }
      });
    });
  }

  /* =========================================================================
     CONFIRMAÇÃO DE PRESENÇA (WhatsApp)
     ========================================================================= */
  /** Monta a mensagem a partir do formulário e abre o WhatsApp. */
  function initConfirmacao() {
    const form = $('[data-form-confirmacao]');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const nome = form.nome.value.trim();
      const acompanhantes = form.acompanhantes.value.trim() || '0';
      const observacoes = form.observacoes.value.trim() || 'Nenhuma';

      if (!nome) {
        mostrarToast('Por favor, informe seu nome completo.');
        form.nome.focus();
        return;
      }

      const mensagem = CONFIG.mensagemConfirmacao
        .replace('{nome}', nome)
        .replace('{acompanhantes}', acompanhantes)
        .replace('{observacoes}', observacoes);

      const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(mensagem)}`;
      window.open(url, '_blank', 'noopener');

      mostrarToast(CONFIG.avisoConfirmacao, 6500);
      form.reset();
    });
  }

  /* =========================================================================
     TOAST
     ========================================================================= */
  let toastTimer = null;
  /**
   * Exibe um aviso flutuante temporário.
   * @param {string} texto
   * @param {number} [duracao=4000] em milissegundos
   */
  function mostrarToast(texto, duracao = 4000) {
    const toast = $('[data-toast]');
    if (!toast) return;
    toast.textContent = texto;
    toast.classList.add('is-visivel', 'toast__borda');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visivel'), duracao);
  }

  /* =========================================================================
     CONTAGEM REGRESSIVA
     ========================================================================= */
  /** Atualiza dias/horas/minutos/segundos até CONFIG.dataEvento, a cada segundo. */
  function initContagem() {
    const raiz = $('[data-contagem]');
    if (!raiz) return;

    const els = {
      dias:  $('[data-cont-dias]', raiz),
      horas: $('[data-cont-horas]', raiz),
      min:   $('[data-cont-min]', raiz),
      seg:   $('[data-cont-seg]', raiz),
    };
    const alvo = new Date(CONFIG.dataEvento).getTime();
    const doisDigitos = (n) => String(n).padStart(2, '0');

    const tick = () => {
      const restante = alvo - Date.now();

      // Evento já começou/passou: mostra mensagem no lugar dos números.
      if (restante <= 0) {
        raiz.classList.add('contagem--encerrada');
        raiz.textContent = 'É hoje! Que Deus abençoe este dia.';
        clearInterval(intervalo);
        return;
      }

      const seg = Math.floor(restante / 1000);
      els.dias.textContent  = doisDigitos(Math.floor(seg / 86400));
      els.horas.textContent = doisDigitos(Math.floor((seg % 86400) / 3600));
      els.min.textContent   = doisDigitos(Math.floor((seg % 3600) / 60));
      els.seg.textContent   = doisDigitos(seg % 60);
    };

    tick();
    const intervalo = setInterval(tick, 1000);
  }

  /* =========================================================================
     TELA DE ABERTURA (ENVELOPE CINEMATOGRÁFICO)
     ========================================================================= */
  /**
   * Poeira dourada flutuando no fundo da abertura (canvas leve, 60fps).
   * @param {HTMLCanvasElement} canvas
   * @returns {() => void} função para parar e limpar a animação
   */
  function initParticulas(canvas) {
    if (!canvas || prefereReduzirMovimento) return () => {};
    const ctx = canvas.getContext('2d');
    let raf = 0, larg = 0, alt = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particulas = [];

    const dimensionar = () => {
      larg = canvas.clientWidth; alt = canvas.clientHeight;
      canvas.width = larg * dpr; canvas.height = alt * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const criar = () => {
      const total = Math.round(Math.min(70, (larg * alt) / 16000));
      particulas = Array.from({ length: total }, () => ({
        x: Math.random() * larg, y: Math.random() * alt,
        r: Math.random() * 1.8 + 0.6,
        vy: -(Math.random() * 0.25 + 0.08),
        sway: Math.random() * 0.6 + 0.2, fase: Math.random() * Math.PI * 2,
        brilho: Math.random() * 0.5 + 0.25,
      }));
    };
    const desenhar = () => {
      ctx.clearRect(0, 0, larg, alt);
      for (const p of particulas) {
        p.y += p.vy; p.fase += 0.01; p.x += Math.sin(p.fase) * p.sway * 0.3;
        if (p.y < -5) { p.y = alt + 5; p.x = Math.random() * larg; }
        const cintila = p.brilho * (0.6 + 0.4 * Math.sin(p.fase * 2));
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(225, 205, 160, ${cintila})`;
        ctx.shadowColor = 'rgba(225,205,160,0.8)'; ctx.shadowBlur = 6;
        ctx.fill();
      }
      raf = requestAnimationFrame(desenhar);
    };

    dimensionar(); criar(); desenhar();
    const aoRedimensionar = () => { dimensionar(); criar(); };
    window.addEventListener('resize', aoRedimensionar);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', aoRedimensionar); };
  }

  /**
   * Orquestra a abertura: romper o lacre → abrir a aba → carta flutua para fora →
   * zoom de revelação com entrada coreografada do Hero.
   */
  function initAbertura() {
    const abertura = $('[data-abertura]');
    const lacre = $('[data-abertura-lacre]');
    if (!abertura || !lacre) return;

    // Brasão: se a imagem não carregar (ainda não adicionada), mostra o texto "L&J".
    const brasao = $('[data-brasao]', lacre);
    if (brasao) {
      const semBrasao = () => lacre.classList.add('sem-brasao');
      brasao.addEventListener('error', semBrasao, { once: true });
      if (!brasao.getAttribute('src') || (brasao.complete && brasao.naturalWidth === 0)) semBrasao();
    }

    // Poeira dourada de fundo.
    const pararParticulas = initParticulas($('[data-particulas]', abertura));

    // Trava o scroll e segura a entrada do Hero.
    document.body.classList.add('abertura-ativa', 'aguardando-abertura');

    // Fases (ms). Sob redução de movimento, tudo quase imediato.
    const rm = prefereReduzirMovimento;
    const T = rm
      ? { aba: 20, sai: 120, fim: 260 }
      : { aba: 650, sai: 2300, fim: 3250 };

    let aberto = false;
    const abrir = () => {
      if (aberto) return;
      aberto = true;
      // 1) rompe o selo (onda de choque + selo sobe e some)
      abertura.classList.add('is-abrindo');
      // 2) abre a aba revelando o forro; a carta sai por CSS junto de .is-aberto
      setTimeout(() => abertura.classList.add('is-aberto'), T.aba);
      // 3) zoom de revelação + entrada coreografada do Hero
      setTimeout(() => {
        abertura.classList.add('is-saindo');
        document.body.classList.remove('abertura-ativa', 'aguardando-abertura');
        document.body.classList.add('site-revelado');
      }, T.sai);
      // 4) limpeza
      setTimeout(() => { pararParticulas(); abertura.remove(); }, T.fim);
    };

    lacre.addEventListener('click', abrir);
    lacre.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); }
    });
  }

  /* =========================================================================
     LISTA DE PRESENTES — modal + confirmação "presenteei"
     Pagamentos (Pix/cartão) entram aqui quando os links da InfinitePay
     forem definidos. Por ora abrem um aviso "em breve".
     ========================================================================= */
  function initPresentes() {
    const modal = $('[data-modal]');
    if (!modal) return;

    const elNome = $('[data-modal-nome]', modal);
    const elValor = $('[data-modal-valor]', modal);
    const form = $('[data-form-presente]', modal);
    const elLink = $('[data-modal-link]', modal);
    let cota = { nome: '', valor: '', link: '' };

    const abrir = (nome, valor, link) => {
      cota = { nome, valor, link };
      elNome.textContent = nome;
      elValor.textContent = 'R$ ' + valor;
      if (elLink) {
        if (link) { elLink.href = link; elLink.style.display = ''; }
        else { elLink.removeAttribute('href'); elLink.style.display = 'none'; }
      }
      modal.hidden = false;
      requestAnimationFrame(() => modal.classList.add('is-aberto'));
      document.body.classList.add('modal-ativo');
    };
    const fechar = () => {
      modal.classList.remove('is-aberto');
      document.body.classList.remove('modal-ativo');
      setTimeout(() => { modal.hidden = true; }, 320);
    };

    // Botão "Presentear" de cada card abre o modal com a cota escolhida.
    $$('[data-cota]').forEach((card) => {
      const nome = card.dataset.cotaNome;
      const valor = card.dataset.cotaValor;
      const link = card.dataset.cotaLink || '';
      $$('[data-cota-pagar]', card).forEach((b) => b.addEventListener('click', () => abrir(nome, valor, link)));
    });

    $$('[data-modal-fechar]', modal).forEach((b) => b.addEventListener('click', fechar));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) fechar(); });

    // Confirmação "presenteei" → abre o WhatsApp com a mensagem pronta (FUNCIONAL).
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = form.nome.value.trim();
      if (!nome) { mostrarToast('Por favor, informe seu nome.'); form.nome.focus(); return; }
      const msg = form.mensagem.value.trim();
      const texto = CONFIG.mensagemPresente
        .replace('{nome}', nome)
        .replace('{valor}', cota.valor)
        .replace('{cota}', cota.nome)
        .replace('{mensagem}', msg ? msg + '\n\n' : '');
      window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
      mostrarToast('Obrigado! Sua mensagem está pronta no WhatsApp. 💚', 6000);
      form.reset();
      fechar();
    });
  }

  /* =========================================================================
     INICIALIZAÇÃO
     ========================================================================= */
  function init() {
    initAbertura();
    initMenuMobile();
    initCabecalho();
    initAnimacoes();
    initImagens();
    initCarrosseis();
    initCopiarEndereco();
    initConfirmacao();
    initContagem();
    initPresentes();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
