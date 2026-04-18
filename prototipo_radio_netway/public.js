/* =====================================================
   RADIONETWAY.TECH — Interface Pública + Painel Admin
   public.js v2.0 — Painel completo com localStorage
   ===================================================== */

'use strict';

// ══════════════════════════════════════════════════════
// 1. ESTADO DO SITE (localStorage)
// ══════════════════════════════════════════════════════

var siteData = {
    companyName: 'RadioNetway.Tech',
    slogan:      'Conectando você ao mundo!',
    whatsapp:    '5500000000000',
    banners: [
        {
            id:    'b1',
            title: 'Internet de Alta Velocidade',
            desc:  'Planos a partir de R$ 79,90/mês. Fibra óptica com instalação grátis!',
            price: 'R$ 79,90/mês',
            img:   ''
        },
        {
            id:    'b2',
            title: 'Suporte Técnico Especializado',
            desc:  'Assistência técnica para computadores, notebooks e redes.',
            price: 'Sob consulta',
            img:   ''
        },
        {
            id:    'b3',
            title: 'Soluções em TI para Empresas',
            desc:  'Infraestrutura, segurança e suporte corporativo completo.',
            price: 'Consulte-nos',
            img:   ''
        }
    ]
};

function saveSiteData() {
    try {
        localStorage.setItem('rnw_site_data', JSON.stringify(siteData));
    } catch(e) {
        console.warn('saveSiteData: falha no localStorage', e);
    }
}

function loadSiteData() {
    try {
        var raw = localStorage.getItem('rnw_site_data');
        if (raw) {
            var parsed = JSON.parse(raw);
            // Mesclar mantendo defaults caso falte algum campo
            siteData.companyName = parsed.companyName || siteData.companyName;
            siteData.slogan      = parsed.slogan      || siteData.slogan;
            siteData.whatsapp    = parsed.whatsapp    || siteData.whatsapp;
            if (Array.isArray(parsed.banners) && parsed.banners.length > 0) {
                siteData.banners = parsed.banners;
            }
        }
    } catch(e) { /* usar defaults */ }
}

// ══════════════════════════════════════════════════════
// 2. APLICAR DADOS NO SITE
// ══════════════════════════════════════════════════════

function applySiteData() {
    // Nome da empresa
    var nameEls = document.querySelectorAll('[data-site="companyName"]');
    nameEls.forEach(function(el) { el.textContent = siteData.companyName; });

    // Slogan
    var sloganEls = document.querySelectorAll('[data-site="slogan"]');
    sloganEls.forEach(function(el) { el.textContent = siteData.slogan; });

    // Título da aba
    document.title = siteData.companyName + ' — Rádio Online';

    // WhatsApp
    var waLinks = document.querySelectorAll('[data-site="whatsapp"]');
    waLinks.forEach(function(el) {
        el.href = 'https://wa.me/' + siteData.whatsapp.replace(/\D/g, '');
    });
}

// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
// 3. CAROUSEL DE BANNERS (refatorado do zero)
// Layout: [IMAGEM] / [DESCRIÇÃO ABAIXO] — um slide por vez
// ══════════════════════════════════════════════════════

var carouselIndex  = 0;
var carouselTimer  = null;
var carouselPaused = false;
var CAROUSEL_INTERVAL = 5000; // ms entre slides automáticos

/* ── Renderização completa ── */
function renderCarousel() {
    var track   = document.getElementById('bnrTrack');
    var dotsEl  = document.getElementById('bnrDots');
    var prevBtn = document.getElementById('bnrPrev');
    var nextBtn = document.getElementById('bnrNext');
    if (!track) return;

    // Limpar tudo
    track.innerHTML = '';
    if (dotsEl) dotsEl.innerHTML = '';
    carouselIndex = 0;

    var banners = siteData.banners || [];

    // ── Estado vazio ──
    if (banners.length === 0) {
        track.innerHTML =
            '<div class="bnr-slide bnr-slide--empty">' +
                '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" style="margin:0 auto 12px;display:block;opacity:.35"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
                'Nenhum banner cadastrado.<br>Adicione banners no Painel Admin (Alt+Z)' +
            '</div>';
        if (prevBtn) prevBtn.classList.add('hidden');
        if (nextBtn) nextBtn.classList.add('hidden');
        return;
    }

    // ── Montar slides ──
    banners.forEach(function(banner, i) {
        var slide = document.createElement('div');
        slide.className = 'bnr-slide';

        // Bloco da imagem
        var imgBlock = '';
        if (banner.img) {
            imgBlock =
                '<div class="bnr-slide__img-wrap">' +
                    '<img class="bnr-slide__img" src="' + escSrc(banner.img) + '" alt="' + escAttr(banner.title || 'Banner') + '" loading="lazy">' +
                '</div>';
        } else {
            imgBlock =
                '<div class="bnr-slide__img-wrap">' +
                    '<div class="bnr-slide__img-placeholder">' +
                        '<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
                    '</div>' +
                '</div>';
        }

        // Bloco da descrição — só renderiza se existir texto
        var descText = (banner.desc || '').trim();
        var descBlock = descText
            ? '<div class="bnr-slide__desc">' + escTxt(descText) + '</div>'
            : '';

        slide.innerHTML = imgBlock + descBlock;
        track.appendChild(slide);

        // Dot
        if (dotsEl && banners.length > 1) {
            var dot = document.createElement('button');
            dot.className = 'bnr-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', 'Banner ' + (i + 1));
            dot.setAttribute('data-idx', i);
            dot.addEventListener('click', function() {
                goToSlide(parseInt(this.getAttribute('data-idx'), 10));
            });
            dotsEl.appendChild(dot);
        }
    });

    // Ocultar botões se só há 1 slide
    var single = banners.length <= 1;
    if (prevBtn) prevBtn.classList.toggle('hidden', single);
    if (nextBtn) nextBtn.classList.toggle('hidden', single);

    // Posicionar sem animação na renderização inicial
    _bnrMove(false);
    stopCarouselTimer();
    startCarouselTimer();
}

/* ── Mover o track para o slide atual ── */
function _bnrMove(animate) {
    var track = document.getElementById('bnrTrack');
    if (!track) return;

    if (animate === false) {
        track.style.transition = 'none';
        void track.offsetWidth; // forçar reflow
    } else {
        track.style.transition = 'transform 0.48s cubic-bezier(0.4, 0, 0.2, 1)';
    }

    track.style.transform = 'translateX(-' + (carouselIndex * 100) + '%)';

    // Atualizar dots
    document.querySelectorAll('.bnr-dot').forEach(function(d, i) {
        d.classList.toggle('active', i === carouselIndex);
    });
}

/* ── Navegar para slide específico ── */
function goToSlide(idx) {
    var total = (siteData.banners || []).length;
    if (total === 0) return;
    carouselIndex = ((idx % total) + total) % total;
    _bnrMove(true);
    resetCarouselTimer();
}

function carouselNext() { goToSlide(carouselIndex + 1); }
function carouselPrev() { goToSlide(carouselIndex - 1); }

/* ── Auto-play ── */
function startCarouselTimer() {
    stopCarouselTimer();
    if ((siteData.banners || []).length <= 1) return;
    carouselTimer = setInterval(function() {
        if (!carouselPaused) carouselNext();
    }, CAROUSEL_INTERVAL);
}
function stopCarouselTimer()  { if (carouselTimer) { clearInterval(carouselTimer); carouselTimer = null; } }
function resetCarouselTimer() { stopCarouselTimer(); startCarouselTimer(); }

/* ── Hover pause + swipe touch ── */
(function initCarouselInteraction() {
    document.addEventListener('DOMContentLoaded', function() {
        var root = document.getElementById('bnrRoot');
        if (!root) return;

        // Pause no hover (desktop)
        root.addEventListener('mouseenter', function() { carouselPaused = true; });
        root.addEventListener('mouseleave', function() { carouselPaused = false; });

        // Swipe em touch (mobile)
        var startX = 0;
        root.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
        }, { passive: true });
        root.addEventListener('touchend', function(e) {
            var diff = startX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) {
                diff > 0 ? carouselNext() : carouselPrev();
            }
        }, { passive: true });
    });
})();

// ══════════════════════════════════════════════════════
// 4. PAINEL ADMIN
// ══════════════════════════════════════════════════════

var adminOpen = false;

// Acesso: Alt + Z → ABRE admin.html EM NOVA ABA (NÃO popup/modal)
document.addEventListener('keydown', function(e) {
    if (e.altKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        window.open('admin.html', '_blank');
    }
    // Ctrl+M: toggle admin/public (compatibilidade legada)
    if (e.ctrlKey && e.key.toLowerCase() === 'm') toggleAdminView();
});

// Mantidas por compatibilidade — Alt+Z agora abre admin.html em nova aba
function toggleAdminPanel() {
    window.open('admin.html', '_blank');
}

function closeAdminPanel() {
    // Nada a fazer — admin é página separada
    adminOpen = false;
}

// Tab switching
function showAdminTab(tabName) {
    document.querySelectorAll('.admin-tab-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.admin-tab-content').forEach(function(content) {
        content.classList.toggle('hidden', content.dataset.tab !== tabName);
    });
}

function refreshAdminPanel() {
    // Popular campos de textos
    var cnInput = document.getElementById('adminCompanyName');
    var slInput = document.getElementById('adminSlogan');
    var waInput = document.getElementById('adminWhatsapp');
    if (cnInput) cnInput.value = siteData.companyName;
    if (slInput) slInput.value = siteData.slogan;
    if (waInput) waInput.value = siteData.whatsapp;

    renderAdminBanners();
}

// ── Salvar textos ─────────────────────────────────────
function saveTexts() {
    var cn = document.getElementById('adminCompanyName');
    var sl = document.getElementById('adminSlogan');
    var wa = document.getElementById('adminWhatsapp');
    if (cn) siteData.companyName = cn.value.trim() || siteData.companyName;
    if (sl) siteData.slogan      = sl.value.trim() || siteData.slogan;
    if (wa) siteData.whatsapp    = wa.value.trim() || siteData.whatsapp;

    saveSiteData();
    applySiteData();
    showAdminToast('✅ Textos salvos com sucesso!');
}

// ── Banners ───────────────────────────────────────────
function renderAdminBanners() {
    var list = document.getElementById('adminBannerList');
    if (!list) return;
    list.innerHTML = '';

    if (siteData.banners.length === 0) {
        list.innerHTML = '<div class="admin-empty">Nenhum banner cadastrado.</div>';
        return;
    }

    siteData.banners.forEach(function(banner, i) {
        var div = document.createElement('div');
        div.className = 'admin-banner-item';
        div.id = 'adminBannerItem_' + banner.id;

        div.innerHTML =
            '<div class="admin-banner-header">' +
                '<div class="admin-banner-num">' + (i + 1) + '</div>' +
                '<div class="admin-banner-title-preview">' + escTxt(banner.title || 'Banner sem título') + '</div>' +
                '<div class="admin-banner-actions">' +
                    (i > 0 ? '<button class="admin-icon-btn" title="Mover para cima" onclick="moveBanner(\'' + banner.id + '\', -1)">↑</button>' : '') +
                    (i < siteData.banners.length - 1 ? '<button class="admin-icon-btn" title="Mover para baixo" onclick="moveBanner(\'' + banner.id + '\', 1)">↓</button>' : '') +
                    '<button class="admin-icon-btn admin-icon-btn--del" title="Remover banner" onclick="deleteBanner(\'' + banner.id + '\')">✕</button>' +
                '</div>' +
            '</div>' +
            '<div class="admin-banner-fields">' +
                '<label>Título</label>' +
                '<input type="text" class="admin-input" id="bTitle_' + banner.id + '" value="' + escAttr(banner.title) + '" placeholder="Ex: Internet Fibra Óptica">' +

                '<label>Descrição</label>' +
                '<textarea class="admin-input admin-textarea" id="bDesc_' + banner.id + '" placeholder="Descrição do produto/serviço">' + escTxt(banner.desc) + '</textarea>' +

                '<label>Preço / CTA</label>' +
                '<input type="text" class="admin-input" id="bPrice_' + banner.id + '" value="' + escAttr(banner.price) + '" placeholder="Ex: R$ 79,90/mês">' +

                '<label>Imagem (URL ou upload)</label>' +
                '<div class="admin-img-row">' +
                    '<input type="text" class="admin-input admin-input--flex" id="bImg_' + banner.id + '" value="' + escAttr(banner.img) + '" placeholder="https://...">' +
                    '<label class="admin-upload-btn" title="Upload de imagem">' +
                        '📁' +
                        '<input type="file" accept="image/*" style="display:none" onchange="handleBannerImgUpload(event, \'' + banner.id + '\')">' +
                    '</label>' +
                '</div>' +
                (banner.img ? '<div class="admin-img-preview"><img src="' + escAttr(banner.img) + '" alt="preview"></div>' : '') +

                '<button class="admin-save-btn" onclick="saveBanner(\'' + banner.id + '\')">💾 Salvar Banner</button>' +
            '</div>';

        list.appendChild(div);
    });
}

function addBanner() {
    var newBanner = {
        id:    'b' + Date.now(),
        title: 'Novo Banner',
        desc:  'Descrição do produto ou serviço',
        price: 'Consulte',
        img:   ''
    };
    siteData.banners.push(newBanner);
    saveSiteData();
    renderAdminBanners();
    renderCarousel();
    // Scroll para o novo banner
    setTimeout(function() {
        var el = document.getElementById('adminBannerItem_' + newBanner.id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function saveBanner(id) {
    var banner = siteData.banners.find(function(b) { return b.id === id; });
    if (!banner) return;

    var tEl = document.getElementById('bTitle_' + id);
    var dEl = document.getElementById('bDesc_'  + id);
    var pEl = document.getElementById('bPrice_' + id);
    var iEl = document.getElementById('bImg_'   + id);

    if (tEl) banner.title = tEl.value.trim();
    if (dEl) banner.desc  = dEl.value.trim();
    if (pEl) banner.price = pEl.value.trim();
    if (iEl && iEl.value.trim()) banner.img = iEl.value.trim();

    saveSiteData();
    renderCarousel();
    renderAdminBanners();
    showAdminToast('✅ Banner salvo!');
}

function deleteBanner(id) {
    if (!confirm('Remover este banner?')) return;
    siteData.banners = siteData.banners.filter(function(b) { return b.id !== id; });
    if (carouselIndex >= siteData.banners.length) carouselIndex = Math.max(0, siteData.banners.length - 1);
    saveSiteData();
    renderAdminBanners();
    renderCarousel();
    showAdminToast('🗑️ Banner removido.');
}

function moveBanner(id, dir) {
    var idx = siteData.banners.findIndex(function(b) { return b.id === id; });
    var newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= siteData.banners.length) return;
    var tmp = siteData.banners[idx];
    siteData.banners[idx]    = siteData.banners[newIdx];
    siteData.banners[newIdx] = tmp;
    saveSiteData();
    renderAdminBanners();
    renderCarousel();
}

function handleBannerImgUpload(event, id) {
    var file = event.target.files[0];
    if (!file) return;
    if (!file.type.match(/image\//)) { showAdminToast('❌ Apenas imagens são aceitas.'); return; }
    if (file.size > 5 * 1024 * 1024) { showAdminToast('❌ Imagem muito grande (máx. 5MB).'); return; }

    var reader = new FileReader();
    reader.onload = function(e) {
        var banner = siteData.banners.find(function(b) { return b.id === id; });
        if (banner) {
            banner.img = e.target.result;
            var iEl = document.getElementById('bImg_' + id);
            if (iEl) iEl.value = '[imagem carregada]';
        }
        saveSiteData();
        renderAdminBanners();
        renderCarousel();
        showAdminToast('✅ Imagem carregada!');
    };
    reader.readAsDataURL(file);
}

// ── Toast do painel admin ─────────────────────────────
var adminToastTimer = null;
function showAdminToast(msg) {
    var el = document.getElementById('adminToast');
    if (!el) return;
    if (adminToastTimer) clearTimeout(adminToastTimer);
    el.textContent = msg;
    el.classList.add('visible');
    adminToastTimer = setTimeout(function() { el.classList.remove('visible'); }, 3000);
}

// ══════════════════════════════════════════════════════
// 5. TOGGLE ADMIN VIEW (compatibilidade Ctrl+M original)
// ══════════════════════════════════════════════════════

function toggleAdminView() {
    var pub   = document.getElementById('publicView');
    var admin = document.getElementById('adminView');
    if (!admin) return;
    if (admin.classList.contains('hidden')) {
        if (pub) pub.classList.add('hidden');
        admin.classList.remove('hidden');
    } else {
        admin.classList.add('hidden');
        if (pub) pub.classList.remove('hidden');
    }
}

function hideAdmin() {
    var admin = document.getElementById('adminView');
    var pub   = document.getElementById('publicView');
    if (admin) admin.classList.add('hidden');
    if (pub)   pub.classList.remove('hidden');
}

// ══════════════════════════════════════════════════════
// 6. PLAYER ESCRAVO — INDEX.HTML
//    Lê rnw_broadcast do localStorage e reage automaticamente
// ══════════════════════════════════════════════════════

var pubPlayer        = null;
var pubPlayerReady   = false;
var pubLastVideoId   = null;
var pubLastStatus    = null;
var pubLastBcastTs   = 0;
var pubSyncTimer     = null;
var pubIsAdminPage   = false;  // true quando script.js também está carregado (admin)

// Detecta se estamos na página admin (script.js já declarou "player")
function pubDetectAdminPage() {
    // Se script.js está carregado na mesma página, não criamos player escravo
    return (typeof queue !== 'undefined');
}

// Injeta a API do YouTube para o player público
function pubInjectYT() {
    if (typeof YT !== 'undefined' && YT.Player) {
        pubInitPlayer();
        return;
    }
    // Aguarda a API já carregada pelo script.js (se existir) ou carrega nova
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        var tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
    }
    // Encadeia no callback global sem sobrescrever o do admin
    var prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function() {
        if (typeof prevCallback === 'function') prevCallback();
        pubInitPlayer();
    };
}

function pubInitPlayer() {
    var container = document.getElementById('ytPlayer');
    if (!container) return;                  // não é a página de index com player público
    if (pubDetectAdminPage()) return;        // admin usa seu próprio player — não criar duplicata

    pubPlayer = new YT.Player('ytPlayer', {
        width:  '100%',
        height: '100%',
        playerVars: {
            autoplay:       1,
            controls:       0,
            modestbranding: 1,
            rel:            0,
            enablejsapi:    1,
            playsinline:    1,
            mute:           0,
            origin:         window.location.origin
        },
        events: {
            onReady: function(e) {
                pubPlayerReady = true;
                e.target.setVolume(80);
                // Aplicar estado imediatamente
                pubApplyBroadcast(pubReadBroadcast());
            },
            onStateChange: function(e) {
                // Se o player escravo parou por si só (fim de vídeo), ignorar —
                // o próximo broadcast do admin vai ditar o próximo estado
            },
            onError: function(e) {
                console.warn('pubPlayer erro:', e.data);
            }
        }
    });
}

function pubReadBroadcast() {
    try {
        var raw = localStorage.getItem('rnw_broadcast');
        return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
}

// ── Variáveis de controle de anuncio no index ────────
var pubAdAudio      = null;   // Audio() do anuncio tocando
var pubAdLastTs     = 0;      // ts do ultimo broadcast de anuncio processado
var pubAdPlaying    = false;  // true enquanto anuncio estiver rodando

// Fade suave no player escravo do index
function pubFadeVolume(fromVol, toVol, durationMs, onDone) {
    if (!pubPlayer || !pubPlayerReady) { if (onDone) onDone(); return; }
    var steps    = 30;
    var interval = durationMs / steps;
    var delta    = (toVol - fromVol) / steps;
    var current  = fromVol;
    var step     = 0;
    var timer = setInterval(function() {
        step++;
        current += delta;
        var vol = Math.round(Math.max(0, Math.min(100, current)));
        try { pubPlayer.setVolume(vol); } catch(e) {}
        if (step >= steps) {
            clearInterval(timer);
            try { pubPlayer.setVolume(toVol); } catch(e) {}
            if (onDone) onDone();
        }
    }, interval);
}

// Toca anuncio no index com ducking
function pubPlayAd(adData, adName, normalVol) {
    if (!adData) return;
    if (pubAdPlaying) return; // ja tocando, ignorar duplicatas

    pubAdPlaying = true;

    // Fade down da musica (1.2s) depois toca o anuncio
    pubFadeVolume(normalVol, Math.max(Math.round(normalVol * 0.30), 5), 1200, function() {
        var duckVol = Math.max(Math.round(normalVol * 0.30), 5);

        var audio = new Audio(adData);
        audio.volume = 1.0;
        pubAdAudio = audio;

        audio.play().catch(function(e) {
            console.warn('pubPlayAd: autoplay bloqueado', e);
            pubRestoreAfterAd(normalVol, duckVol);
        });

        audio.onended = function() { pubRestoreAfterAd(normalVol, duckVol); };
        audio.onerror = function() { pubRestoreAfterAd(normalVol, duckVol); };
    });
}

// Restaura volume do index apos anuncio
function pubRestoreAfterAd(normalVol, duckVol) {
    pubAdPlaying = false;
    pubAdAudio   = null;

    // Fade up (2.5s)
    pubFadeVolume(duckVol, normalVol, 2500, null);
}

function pubApplyBroadcast(state) {
    if (!state) return;

    // Atualizar UI de título/canal/status independente do player
    var nt = document.getElementById('npTitle');
    var nc = document.getElementById('npChannel');
    if (nt) nt.textContent = state.title   || 'Nenhuma música tocando';
    if (nc) nc.textContent = state.channel || 'RadioNetway.Tech';

    // Hero player
    var pubT = document.getElementById('pubTitle');
    var pubC = document.getElementById('pubChannel');
    if (pubT) pubT.textContent = state.title   || 'Nenhuma música tocando';
    if (pubC) pubC.textContent = state.channel || 'RadioNetway.Tech';

    // Status badge
    var dot  = document.getElementById('statusDot');
    var txt  = document.getElementById('statusText');
    var dot2 = document.getElementById('statusDot2');
    var txt2 = document.getElementById('statusText2');
    var pill = document.getElementById('statusPill');
    var badge = document.getElementById('liveBadge');
    var rm    = document.getElementById('radioMessage');

    var isLive = (state.status === 'playing');
    var isAd   = (state.status === 'ad');
    var label  = isLive ? 'No Ar' : (isAd ? 'Anúncio' : 'Offline');
    var dotCls = isLive ? 'status-dot--live' : (isAd ? 'status-dot--ad' : 'status-dot--off');

    if (dot)  { dot.className  = 'status-dot ' + dotCls; }
    if (txt)  { txt.textContent  = label; }
    if (dot2) { dot2.className = 'status-dot ' + dotCls; }
    if (txt2) { txt2.textContent = label; }
    if (pill) { pill.className = 'status-pill' + (isLive ? ' live' : isAd ? ' ad' : ''); }
    if (badge){ badge.classList.toggle('on', isLive || isAd); }
    if (rm)   { rm.classList.toggle('hidden', !(isLive || isAd)); }

    // Vinyl / soundwave
    var vinyl = document.getElementById('vinyl');
    var wave  = document.getElementById('soundwave');
    if (vinyl) vinyl.classList.toggle('spinning', isLive);
    if (wave)  wave.classList.toggle('active', isLive);

    // Thumbnail
    var thumb    = document.getElementById('pubThumb');
    var fallback = document.getElementById('pubThumbFallback');
    if (thumb) {
        if (state.thumbnail) {
            thumb.src = state.thumbnail;
            thumb.classList.remove('hidden');
            if (fallback) fallback.style.display = 'none';
        } else {
            thumb.classList.add('hidden');
            if (fallback) fallback.style.display = '';
        }
    }

    // Botão play público
    var pubIcon  = document.getElementById('pubPlayIcon');
    var pubIcon2 = document.getElementById('pubPlayIcon2');
    var btnIcon  = document.getElementById('btnIcon');
    var playPath = isLive
        ? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'
        : '<path d="M8 5v14l11-7z"/>';
    if (pubIcon)  pubIcon.innerHTML  = playPath;
    if (pubIcon2) pubIcon2.innerHTML = playPath;
    if (btnIcon)  btnIcon.innerHTML  = playPath;

    // Ad overlay
    var adOv = document.getElementById('adOverlay');
    if (adOv) adOv.classList.toggle('hidden', !isAd);

    // ── Anuncio de audio mp3: tocar no index com ducking ──
    if (isAd && state.adData && state.ts !== pubAdLastTs) {
        pubAdLastTs = state.ts;
        var normalVol = (pubPlayer && pubPlayerReady)
            ? (function(){ try { return pubPlayer.getVolume(); } catch(e){ return 80; } })()
            : 80;
        pubPlayAd(state.adData, state.adName || 'Anúncio', normalVol);
    }

    // ── Controle do player escravo ──
    if (!pubPlayer || !pubPlayerReady) return;

    if (state.status === 'stopped') {
        try { pubPlayer.stopVideo(); } catch(e) {}
        pubLastVideoId = null;
        pubLastStatus  = 'stopped';
        return;
    }

    if (state.status === 'paused') {
        try { pubPlayer.pauseVideo(); } catch(e) {}
        pubLastStatus = 'paused';
        return;
    }

    if ((state.status === 'playing' || state.status === 'ad') && state.videoId) {
        var ytState = -1;
        try { ytState = pubPlayer.getPlayerState(); } catch(e) {}

        // Trocar de vídeo se for um novo
        if (state.videoId !== pubLastVideoId) {
            try {
                pubPlayer.loadVideoById({
                    videoId:   state.videoId,
                    startSeconds: Math.max(0, (state.elapsed || 0) - 1.5) // compensa latência
                });
                pubLastVideoId = state.videoId;
                pubLastStatus  = 'playing';
            } catch(e) {}
            return;
        }

        // Mesmo vídeo: sincronizar posição se desvio > 3s
        try {
            var currentTime = pubPlayer.getCurrentTime() || 0;
            var diff = Math.abs(currentTime - (state.elapsed || 0));
            if (diff > 3) {
                pubPlayer.seekTo(Math.max(0, (state.elapsed || 0) - 1), true);
            }
        } catch(e) {}

        // Retomar se pausado
        if (ytState === YT.PlayerState.PAUSED || ytState === YT.PlayerState.CUED) {
            try { pubPlayer.playVideo(); } catch(e) {}
        }
        pubLastStatus = 'playing';
    }
}

function pubSyncLoop() {
    var state = pubReadBroadcast();
    if (!state) return;
    // Só reprocessar se houve mudança (ts diferente)
    if (state.ts !== pubLastBcastTs) {
        pubLastBcastTs = state.ts;
        pubApplyBroadcast(state);
    }
}

function pubStartSync() {
    if (pubDetectAdminPage()) {
        // Estamos no admin — usar o syncPublicUI antigo para o mini-player do hero
        setInterval(syncPublicUILegacy, 800);
        return;
    }
    // Escutar storage events (mesma origem, outras abas)
    window.addEventListener('storage', function(e) {
        if (e.key === 'rnw_broadcast') {
            try {
                var state = e.newValue ? JSON.parse(e.newValue) : null;
                if (state) { pubLastBcastTs = state.ts; pubApplyBroadcast(state); }
            } catch(ex) {}
        }
    });
    // Polling de backup (mesma aba ou quando storage event não dispara)
    pubSyncTimer = setInterval(pubSyncLoop, 800);
    // Injetar player escravo
    pubInjectYT();
}

// syncPublicUI legado — usado apenas quando script.js está na mesma página (admin embed)
function syncPublicUILegacy() {
    var isPlaying = (typeof radioActive !== 'undefined') && radioActive;
    var icon  = document.getElementById('pubPlayIcon');
    if (icon) icon.innerHTML = isPlaying ? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>' : '<path d="M8 5v14l11-7z"/>';
    var wave  = document.getElementById('soundwave');
    if (wave)  wave.classList.toggle('active', isPlaying);
    var vinyl = document.getElementById('vinyl');
    if (vinyl) vinyl.classList.toggle('spinning', isPlaying);
    var titleEl = document.getElementById('npTitle');
    var chanEl  = document.getElementById('npChannel');
    var pubT    = document.getElementById('pubTitle');
    var pubC    = document.getElementById('pubChannel');
    if (titleEl && pubT) pubT.textContent = titleEl.textContent;
    if (chanEl  && pubC) pubC.textContent = chanEl.textContent;
    var fill    = document.getElementById('progressFill');
    var pubFill = document.getElementById('pubProgressFill');
    if (fill && pubFill) pubFill.style.width = fill.style.width;
    var elapsed    = document.getElementById('timeElapsed');
    var duration   = document.getElementById('timeDuration');
    var pubElapsed = document.getElementById('pubTimeElapsed');
    var pubDur     = document.getElementById('pubTimeDuration');
    if (elapsed  && pubElapsed) pubElapsed.textContent = elapsed.textContent;
    if (duration && pubDur)     pubDur.textContent     = duration.textContent;
    var vSlider = document.getElementById('volumeSlider');
    var pubVol  = document.getElementById('pubVolumeSlider');
    if (vSlider && pubVol) pubVol.value = vSlider.value;
    var thumb    = document.getElementById('pubThumb');
    var fallback = document.getElementById('pubThumbFallback');
    if (thumb && typeof queue !== 'undefined' && typeof currentIndex !== 'undefined') {
        var track = queue[currentIndex];
        if (track && track.thumbnail) {
            thumb.src = track.thumbnail; thumb.classList.remove('hidden');
            if (fallback) fallback.style.display = 'none';
        } else {
            thumb.classList.add('hidden');
            if (fallback) fallback.style.display = '';
        }
    }
}

// pubTogglePlay agora só funciona para o admin (script.js presente)
// No index puro, o botão não faz nada — a rádio é controlada pelo admin
function pubTogglePlay() {
    if (pubDetectAdminPage()) {
        if (typeof queue !== 'undefined' && queue.length === 0) {
            if (typeof loadDemoPlaylist === 'function') loadDemoPlaylist();
            return;
        }
        if (typeof toggleRadio === 'function') toggleRadio();
    }
    // No index, silenciar/dessilenciar é o máximo que o ouvinte pode fazer
    if (pubPlayer && pubPlayerReady) {
        try {
            var state = pubPlayer.getPlayerState();
            if (state === YT.PlayerState.PAUSED) pubPlayer.playVideo();
        } catch(e) {}
    }
}

// ── Mute icon sync ────────────────────────────────────
function syncMuteIcon() {
    var muted = (typeof isMuted !== 'undefined') && isMuted;
    var icon  = document.getElementById('pubMuteIcon');
    if (!icon) return;
    icon.innerHTML = muted
        ? '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>'
        : '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
}
setInterval(syncMuteIcon, 1000);

// ── Listener count simulado ───────────────────────────
var baseListeners = 200 + Math.floor(Math.random() * 80);
function updateListeners() {
    var delta = Math.floor(Math.random() * 7) - 3;
    baseListeners = Math.max(180, Math.min(320, baseListeners + delta));
    var el = document.getElementById('listenerCount');
    if (el) el.textContent = baseListeners;
}
setInterval(updateListeners, 4000 + Math.random() * 3000);

// ══════════════════════════════════════════════════════
// 7. UTILITÁRIOS
// ══════════════════════════════════════════════════════

function escTxt(str) {
    return String(str || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;');
}
function escAttr(str) {
    return String(str || '').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function escSrc(str) {
    return String(str || '').replace(/"/g,'%22');
}

// ══════════════════════════════════════════════════════
// 8. INICIALIZAÇÃO
// ══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    // Carregar dados salvos
    loadSiteData();

    // Aplicar no site
    applySiteData();

    // Renderizar carousel
    renderCarousel();
    startCarouselTimer();

    // Sincronizar volume inicial
    var vSlider = document.getElementById('volumeSlider');
    var pubVol  = document.getElementById('pubVolumeSlider');
    if (vSlider && pubVol) pubVol.value = vSlider.value;

    // Iniciar sincronização com broadcast do admin
    pubStartSync();

    // Aplicar estado imediato se já houver broadcast salvo
    setTimeout(function() {
        var state = pubReadBroadcast();
        if (state) pubApplyBroadcast(state);
    }, 500);

    // Indicador visual de acesso ao painel
    console.log('%c🎙️ RadioNetway.Tech Admin', 'color:#7c3aed;font-weight:bold;font-size:14px');
    console.log('%cAcesse o painel admin em /admin', 'color:#a78bfa;font-size:12px');
});