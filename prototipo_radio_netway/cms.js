/* =====================================================================
   RADIONETWAY.TECH — CMS Engine v4.0
   cms.js — Controle total do site via Admin
   ===================================================================== */

'use strict';

// ═══════════════════════════════════════════════════════════════
// 1. DEFAULTS & DATA SCHEMA
// ═══════════════════════════════════════════════════════════════

var CMS_KEY = 'rnw_cms_v4';

var cmsDefaults = {
    // HEADER
    header: {
        companyName: 'RadioNetway.Tech',
        slogan: 'Conectando você ao mundo!',
        whatsapp: '5500000000000',
        logoUrl: '',
        btnOuvir: 'OUVIR AGORA',
        btnWa: 'WhatsApp',
        menuItems: [
            { label: 'Início',        href: '#home' },
            { label: 'Rádio ao Vivo', href: '#radio' },
            { label: 'Planos',        href: '#planos' },
            { label: 'Contato',       href: '#contato' }
        ]
    },
    // HERO
    hero: {
        title:       'A RÁDIO IDEAL PARA O SEU DIA',
        subtitle:    'Música ao vivo 24h com qualidade e estabilidade.',
        btnText:     'Ouvir Agora',
        btnSecText:  'Nossos Serviços',
        btnSecLink:  '#servicos',
        stat1Num:    '--',
        stat1Label:  'Ouvintes',
        stat2Num:    '24/7',
        stat2Label:  'No Ar',
        stat3Num:    '100%',
        stat3Label:  'Digital'
    },
    // PLANS
    plans: [
        { id: 'p1', name: '100 MEGA',  price: 'R$ 79,90/mês',  btnText: 'Contratar', benefits: ['Download 100 Mbps', 'Upload 50 Mbps', 'Sem franquia', 'Instalação grátis'], featured: false },
        { id: 'p2', name: '300 MEGA',  price: 'R$ 109,90/mês', btnText: 'Contratar', benefits: ['Download 300 Mbps', 'Upload 150 Mbps', 'Sem franquia', 'Instalação grátis', 'Suporte prioritário'], featured: true },
        { id: 'p3', name: '450 MEGA',  price: 'R$ 149,90/mês', btnText: 'Contratar', benefits: ['Download 450 Mbps', 'Upload 225 Mbps', 'Sem franquia', 'Instalação grátis', 'Suporte 24h', 'IP fixo'], featured: false }
    ],
    // BENEFITS
    benefits: [
        { id: 'bf1', icon: '⚡', title: 'Alta Velocidade',    desc: 'Conexão ultra-rápida para streaming, jogos e trabalho remoto.' },
        { id: 'bf2', icon: '🔒', title: 'Segurança Total',    desc: 'Proteção avançada contra vírus, invasões e ameaças online.' },
        { id: 'bf3', icon: '📞', title: 'Suporte 24h',        desc: 'Nossa equipe está sempre disponível para te ajudar.' },
        { id: 'bf4', icon: '🌐', title: 'Cobertura Ampla',    desc: 'Sinal estável em toda a região com tecnologia fibra óptica.' }
    ],
    // BANNERS (carousel)
    banners: [
        { id: 'b1', title: 'Internet de Alta Velocidade', desc: 'Planos a partir de R$ 79,90/mês. Fibra óptica com instalação grátis!', price: 'R$ 79,90/mês', img: '' },
        { id: 'b2', title: 'Suporte Técnico',             desc: 'Assistência técnica para computadores, notebooks e redes.',           price: 'Sob consulta', img: '' },
        { id: 'b3', title: 'Soluções em TI',              desc: 'Infraestrutura, segurança e suporte corporativo completo.',            price: 'Consulte-nos',  img: '' }
    ],
    // SECTION TEXTS
    sectionTexts: {
        planosTitle:          'Nossos Planos',
        planosSubtitle:       'Escolha o plano ideal para você',
        beneficiosTitle:      'Por que nos escolher?',
        beneficiosSubtitle:   'Conheça os diferenciais da Netway',
        contatoTitle:         'Entre em Contato',
        contatoText:          'Fale conosco pelo WhatsApp e tire todas as suas dúvidas.',
        footer:               '© 2025 RadioNetway.Tech — Todos os direitos reservados.',
        copyright:            'Desenvolvido com ❤️ pela equipe Netway'
    }
};

// ═══════════════════════════════════════════════════════════════
// 2. STATE
// ═══════════════════════════════════════════════════════════════

var cmsData = JSON.parse(JSON.stringify(cmsDefaults));

// Undo/Redo stacks
var undoStack = [];
var redoStack = [];
var changeHistory = [];

// ═══════════════════════════════════════════════════════════════
// 3. PERSISTENCE
// ═══════════════════════════════════════════════════════════════

function cmsSave() {
    try {
        localStorage.setItem(CMS_KEY, JSON.stringify(cmsData));

        // Sincronizar siteData (quando admin e index estao na mesma aba)
        if (typeof siteData !== 'undefined') {
            siteData.companyName = cmsData.header.companyName;
            siteData.slogan      = cmsData.header.slogan;
            siteData.whatsapp    = cmsData.header.whatsapp;
            siteData.banners     = cmsData.banners;
            if (typeof saveSiteData === 'function') saveSiteData();
        }

        // Flag para o index detectar atualizacao via polling
        localStorage.setItem('rnw_cms_updated', Date.now().toString());

    } catch(e) {
        console.warn('cmsSave failed', e);
        if (e.name === 'QuotaExceededError' || (e.code && e.code === 22)) {
            showToast('❌ Armazenamento cheio! Use URLs de imagem ao invés de upload direto.', 'error');
        }
    }
}

function cmsLoad() {
    try {
        var raw = localStorage.getItem(CMS_KEY);
        if (raw) {
            var parsed = JSON.parse(raw);
            // Deep merge
            deepMerge(cmsData, parsed);
        }
    } catch(e) { /* use defaults */ }

    try {
        var hRaw = localStorage.getItem('rnw_cms_history');
        if (hRaw) changeHistory = JSON.parse(hRaw);
    } catch(e) {}
}

function deepMerge(target, source) {
    for (var key in source) {
        if (!source.hasOwnProperty(key)) continue;
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key] || typeof target[key] !== 'object') target[key] = {};
            deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
}

function saveHistory() {
    try { localStorage.setItem('rnw_cms_history', JSON.stringify(changeHistory.slice(-200))); } catch(e) {}
}

// ═══════════════════════════════════════════════════════════════
// 4. UNDO / REDO
// ═══════════════════════════════════════════════════════════════

function pushUndo(sectionKey, previousValue, description) {
    undoStack.push({ section: sectionKey, prev: JSON.parse(JSON.stringify(previousValue)), desc: description });
    redoStack = [];
    if (undoStack.length > 50) undoStack.shift();
    updateUndoRedoUI();
    addHistoryEntry('change', description);
}

function performUndo() {
    if (undoStack.length === 0) return;
    var entry = undoStack.pop();
    // Save current for redo
    var current = JSON.parse(JSON.stringify(getSection(entry.section)));
    redoStack.push({ section: entry.section, prev: current, desc: entry.desc });
    // Restore
    setSection(entry.section, entry.prev);
    cmsSave();
    cmsApplyAll();
    updateUndoRedoUI();
    addHistoryEntry('undo', 'Desfeito: ' + entry.desc);
    showToast('↩ Desfeito: ' + entry.desc);
}

function performRedo() {
    if (redoStack.length === 0) return;
    var entry = redoStack.pop();
    var current = JSON.parse(JSON.stringify(getSection(entry.section)));
    undoStack.push({ section: entry.section, prev: current, desc: entry.desc });
    setSection(entry.section, entry.prev);
    cmsSave();
    cmsApplyAll();
    updateUndoRedoUI();
    addHistoryEntry('redo', 'Refeito: ' + entry.desc);
    showToast('↪ Refeito: ' + entry.desc);
}

function getSection(key) {
    return cmsData[key] !== undefined ? cmsData[key] : {};
}

function setSection(key, value) {
    cmsData[key] = JSON.parse(JSON.stringify(value));
    // Sync banner panel fields after undo/redo
    if (key === 'banners') renderAdminBanners();
    if (key === 'plans')   renderPlans();
    if (key === 'benefits') renderBenefits();
    if (key === 'header')  populateHeaderFields();
    if (key === 'hero')    populateHeroFields();
    if (key === 'sectionTexts') populateSectionTextsFields();
}

function updateUndoRedoUI() {
    var ub = document.getElementById('btnUndo');
    var rb = document.getElementById('btnRedo');
    var ui = document.getElementById('undoInfo');
    if (ub) ub.disabled = undoStack.length === 0;
    if (rb) rb.disabled = redoStack.length === 0;
    if (ui) {
        if (undoStack.length > 0) ui.textContent = 'Pode desfazer: ' + undoStack[undoStack.length-1].desc;
        else ui.textContent = 'Nada para desfazer';
    }
}

// ═══════════════════════════════════════════════════════════════
// 5. HISTORY LOG
// ═══════════════════════════════════════════════════════════════

function addHistoryEntry(type, label, detail) {
    var entry = { type: type, label: label, detail: detail || '', time: Date.now() };
    changeHistory.unshift(entry);
    if (changeHistory.length > 200) changeHistory.pop();
    saveHistory();
    renderHistory();
}

function renderHistory() {
    var list = document.getElementById('historyList');
    if (!list) return;

    if (changeHistory.length === 0) {
        list.innerHTML = '<div class="state-box"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>Nenhuma alteração registrada ainda.</span></div>';
        return;
    }

    var icons = { change:'✏️', undo:'↩', redo:'↪', reset:'🔄', clear:'🗑️' };
    var colors = { change:'rgba(124,58,237,.15)', undo:'rgba(245,158,11,.15)', redo:'rgba(16,185,129,.15)', reset:'rgba(239,68,68,.15)', clear:'rgba(100,116,139,.15)' };

    list.innerHTML = changeHistory.slice(0, 80).map(function(e) {
        var d = new Date(e.time);
        var timeStr = d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
        var dateStr = d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
        return '<div class="hist-entry">' +
            '<div class="hist-entry-icon" style="background:' + (colors[e.type]||'rgba(255,255,255,.05)') + '">' + (icons[e.type]||'📝') + '</div>' +
            '<div class="hist-entry-body">' +
                '<div class="hist-entry-label">' + escHtml(e.label) + '</div>' +
                (e.detail ? '<div class="hist-entry-detail">' + escHtml(e.detail) + '</div>' : '') +
            '</div>' +
            '<div class="hist-entry-time">' + dateStr + ' ' + timeStr + '</div>' +
        '</div>';
    }).join('');
}

function clearHistory() {
    changeHistory = [];
    saveHistory();
    renderHistory();
    showToast('Histórico limpo.');
}

function exportHistory() {
    var blob = new Blob([JSON.stringify(changeHistory, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'radionetway-history-' + Date.now() + '.json';
    a.click();
}

// ═══════════════════════════════════════════════════════════════
// 6. APPLY CMS DATA TO SITE
// ═══════════════════════════════════════════════════════════════

function cmsApplyAll() {
    cmsApplyHeader();
    cmsApplyHero();
    cmsApplyPlans();
    cmsApplyBenefits();
    cmsApplyBanners();
    cmsApplySectionTexts();
}

function cmsApplyHeader() {
    var h = cmsData.header;

    // Company name everywhere
    document.querySelectorAll('[data-site="companyName"]').forEach(function(el) { el.textContent = h.companyName; });
    document.querySelectorAll('[data-site="slogan"]').forEach(function(el) { el.textContent = h.slogan; });
    document.title = h.companyName + ' — Rádio Online';

    // WhatsApp links
    document.querySelectorAll('[data-site="whatsapp"]').forEach(function(el) {
        el.href = 'https://wa.me/' + h.whatsapp.replace(/\D/g, '');
    });

    // Logo
    var logoImgs = document.querySelectorAll('.logo-img');
    var logoIcons = document.querySelectorAll('.logo-icon');
    if (h.logoUrl) {
        logoImgs.forEach(function(img) { img.src = h.logoUrl; img.style.display = 'block'; });
        logoIcons.forEach(function(ic) { ic.style.display = 'none'; });
    } else {
        logoImgs.forEach(function(img) { img.style.display = 'none'; });
        logoIcons.forEach(function(ic) { ic.style.display = ''; });
    }

    // Buttons text
    document.querySelectorAll('[data-cms="btn-ouvir"]').forEach(function(el) { el.textContent = h.btnOuvir; });
    document.querySelectorAll('[data-cms="btn-wa"] span').forEach(function(el) { el.textContent = h.btnWa; });

    // Nav menu
    var navMenu = document.getElementById('navMenu');
    if (navMenu && h.menuItems && h.menuItems.length > 0) {
        navMenu.innerHTML = h.menuItems.map(function(item) {
            return '<a href="' + escAttr(item.href) + '" class="nav-link">' + escHtml(item.label) + '</a>';
        }).join('');
    }
}

function cmsApplyHero() {
    var hc = cmsData.hero;

    setElText('.hero-title', hc.title);
    // subtitle partial — has spans inside, set full if possible
    var subEl = document.querySelector('.hero-subtitle');
    if (subEl && hc.subtitle) {
        // Preserve the spans if subtitle doesn't contain them
        if (!hc.subtitle.includes('<')) {
            subEl.innerHTML = escHtml(hc.subtitle) + ' <span data-site="companyName">' + escHtml(cmsData.header.companyName) + '</span> — <span data-site="slogan">' + escHtml(cmsData.header.slogan) + '</span>';
        }
    }

    // Buttons
    var btnPlay = document.querySelector('.btn-hero-play');
    if (btnPlay) {
        var svg = btnPlay.querySelector('svg');
        btnPlay.textContent = hc.btnText;
        if (svg) btnPlay.insertBefore(svg, btnPlay.firstChild);
    }
    var btnSec = document.querySelector('.btn-hero-outline');
    if (btnSec) { btnSec.textContent = hc.btnSecText; btnSec.href = hc.btnSecLink; }

    // Stats
    setElText('[data-cms="stat1-num"]', hc.stat1Num);
    setElText('[data-cms="stat1-label"]', hc.stat1Label);
    setElText('[data-cms="stat2-num"]', hc.stat2Num);
    setElText('[data-cms="stat2-label"]', hc.stat2Label);
    setElText('[data-cms="stat3-num"]', hc.stat3Num);
    setElText('[data-cms="stat3-label"]', hc.stat3Label);
}

function cmsApplyPlans() {
    var container = document.getElementById('planosContainer');
    if (!container) return;

    container.innerHTML = cmsData.plans.map(function(plan) {
        return '<div class="plano-card' + (plan.featured ? ' plano-card--featured' : '') + '">' +
            (plan.featured ? '<div class="plano-badge">⭐ Mais Popular</div>' : '') +
            '<div class="plano-nome">' + escHtml(plan.name) + '</div>' +
            '<div class="plano-preco">' + escHtml(plan.price) + '</div>' +
            '<ul class="plano-beneficios">' +
                plan.benefits.map(function(b) { return '<li>' + escHtml(b) + '</li>'; }).join('') +
            '</ul>' +
            '<a href="https://wa.me/' + cmsData.header.whatsapp.replace(/\D/g,'') + '" class="plano-btn" target="_blank" rel="noopener">' + escHtml(plan.btnText) + '</a>' +
        '</div>';
    }).join('');
}

function cmsApplyBenefits() {
    var container = document.getElementById('beneficiosContainer');
    if (!container) return;

    container.innerHTML = cmsData.benefits.map(function(bf) {
        return '<div class="beneficio-card">' +
            '<div class="beneficio-icon">' + bf.icon + '</div>' +
            '<div class="beneficio-titulo">' + escHtml(bf.title) + '</div>' +
            '<div class="beneficio-desc">' + escHtml(bf.desc) + '</div>' +
        '</div>';
    }).join('');
}

function cmsApplyBanners() {
    // Sync legacy siteData for carousel compatibility
    if (typeof siteData !== 'undefined') {
        siteData.banners = cmsData.banners;
    }
    if (typeof renderCarousel === 'function') renderCarousel();
}

function cmsApplySectionTexts() {
    var t = cmsData.sectionTexts;
    setElText('[data-cms="planos-title"]', t.planosTitle);
    setElText('[data-cms="planos-subtitle"]', t.planosSubtitle);
    setElText('[data-cms="beneficios-title"]', t.beneficiosTitle);
    setElText('[data-cms="beneficios-subtitle"]', t.beneficiosSubtitle);
    setElText('[data-cms="contato-title"]', t.contatoTitle);
    setElText('[data-cms="contato-text"]', t.contatoText);
    setElText('[data-cms="footer"]', t.footer);
    setElText('[data-cms="copyright"]', t.copyright);
}

function setElText(selector, value) {
    document.querySelectorAll(selector).forEach(function(el) { el.textContent = value; });
}

// ═══════════════════════════════════════════════════════════════
// 7. HEADER SECTION
// ═══════════════════════════════════════════════════════════════

function populateHeaderFields() {
    var h = cmsData.header;
    setVal('hCompanyName', h.companyName);
    setVal('hSlogan', h.slogan);
    setVal('hWhatsapp', h.whatsapp);
    setVal('hLogoUrl', h.logoUrl || '');
    setVal('hBtnOuvir', h.btnOuvir);
    setVal('hBtnWa', h.btnWa);
    renderMenuItems();
}

function saveHeader() {
    var prev = JSON.parse(JSON.stringify(cmsData.header));
    pushUndo('header', prev, 'Editou Header');

    var h = cmsData.header;
    h.companyName = getVal('hCompanyName') || h.companyName;
    h.slogan      = getVal('hSlogan')      || h.slogan;
    h.whatsapp    = getVal('hWhatsapp')    || h.whatsapp;
    h.logoUrl     = getVal('hLogoUrl');
    h.btnOuvir    = getVal('hBtnOuvir')    || h.btnOuvir;
    h.btnWa       = getVal('hBtnWa')       || h.btnWa;

    // Save menu
    var items = [];
    document.querySelectorAll('#menuItemsList .menu-item-row').forEach(function(row) {
        var label = row.querySelector('.menu-label');
        var href  = row.querySelector('.menu-href');
        if (label && href) items.push({ label: label.value.trim(), href: href.value.trim() });
    });
    if (items.length > 0) h.menuItems = items;

    cmsSave();
    cmsApplyHeader();
    showToast('✅ Header salvo com sucesso!');
}

function renderMenuItems() {
    var list = document.getElementById('menuItemsList');
    if (!list) return;

    list.innerHTML = '';
    (cmsData.header.menuItems || []).forEach(function(item, i) {
        var row = document.createElement('div');
        row.className = 'menu-item-row';
        row.innerHTML =
            '<input class="field-input menu-label" type="text" placeholder="Label" value="' + escAttr(item.label) + '">' +
            '<input class="field-input menu-href" type="text" placeholder="#ancora" value="' + escAttr(item.href) + '">' +
            '<button class="btn-icon danger" onclick="removeMenuItem(' + i + ')" title="Remover">' +
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '</button>';
        list.appendChild(row);
    });
}

function addMenuItem() {
    cmsData.header.menuItems.push({ label: 'Novo Item', href: '#' });
    renderMenuItems();
}

function removeMenuItem(idx) {
    cmsData.header.menuItems.splice(idx, 1);
    renderMenuItems();
}

function saveMenu() {
    saveHeader();
}

// ═══════════════════════════════════════════════════════════════
// 8. HERO SECTION
// ═══════════════════════════════════════════════════════════════

function populateHeroFields() {
    var hc = cmsData.hero;
    setVal('heroTitle',      hc.title);
    setVal('heroSubtitle',   hc.subtitle);
    setVal('heroBtnText',    hc.btnText);
    setVal('heroBtnSecText', hc.btnSecText);
    setVal('heroBtnSecLink', hc.btnSecLink);
    setVal('heroStat1Num',   hc.stat1Num);
    setVal('heroStat1Label', hc.stat1Label);
    setVal('heroStat2Num',   hc.stat2Num);
    setVal('heroStat2Label', hc.stat2Label);
    setVal('heroStat3Num',   hc.stat3Num);
    setVal('heroStat3Label', hc.stat3Label);
}

function saveHero() {
    var prev = JSON.parse(JSON.stringify(cmsData.hero));
    pushUndo('hero', prev, 'Editou Banner Hero');

    var hc = cmsData.hero;
    hc.title       = getVal('heroTitle')      || hc.title;
    hc.subtitle    = getVal('heroSubtitle')   || hc.subtitle;
    hc.btnText     = getVal('heroBtnText')    || hc.btnText;
    hc.btnSecText  = getVal('heroBtnSecText') || hc.btnSecText;
    hc.btnSecLink  = getVal('heroBtnSecLink') || hc.btnSecLink;
    hc.stat1Num    = getVal('heroStat1Num')   || hc.stat1Num;
    hc.stat1Label  = getVal('heroStat1Label') || hc.stat1Label;
    hc.stat2Num    = getVal('heroStat2Num')   || hc.stat2Num;
    hc.stat2Label  = getVal('heroStat2Label') || hc.stat2Label;
    hc.stat3Num    = getVal('heroStat3Num')   || hc.stat3Num;
    hc.stat3Label  = getVal('heroStat3Label') || hc.stat3Label;

    cmsSave();
    cmsApplyHero();
    showToast('✅ Banner Hero salvo!');
}

// ═══════════════════════════════════════════════════════════════
// 9. PLANS SECTION
// ═══════════════════════════════════════════════════════════════

function renderPlans() {
    var list = document.getElementById('plansList');
    if (!list) return;

    list.innerHTML = '';
    cmsData.plans.forEach(function(plan, i) {
        var item = document.createElement('div');
        item.className = 'sortable-item';
        item.id = 'planItem_' + plan.id;

        var benefitsText = (plan.benefits || []).join('\n');

        item.innerHTML =
            '<div class="sortable-item-head" onclick="toggleAccordion(\'planBody_' + plan.id + '\')">' +
                '<span class="sortable-drag">⠿</span>' +
                '<span class="sortable-item-title">' +
                    (plan.featured ? '⭐ ' : '') + escHtml(plan.name) + ' — ' + escHtml(plan.price) +
                '</span>' +
                '<div class="sortable-item-actions">' +
                    '<button class="btn btn-danger" style="font-size:11px;padding:4px 8px" onclick="event.stopPropagation();removePlan(\'' + plan.id + '\')">✕</button>' +
                '</div>' +
            '</div>' +
            '<div class="sortable-item-body" id="planBody_' + plan.id + '">' +
                '<div class="grid-2">' +
                    '<div class="field-group"><label class="field-label">Nome do Plano</label>' +
                    '<input class="field-input" id="planName_' + plan.id + '" type="text" value="' + escAttr(plan.name) + '" placeholder="Ex: 450 MEGA"></div>' +

                    '<div class="field-group"><label class="field-label">Preço</label>' +
                    '<input class="field-input" id="planPrice_' + plan.id + '" type="text" value="' + escAttr(plan.price) + '" placeholder="R$ 0,00/mês"></div>' +

                    '<div class="field-group"><label class="field-label">Texto do Botão</label>' +
                    '<input class="field-input" id="planBtn_' + plan.id + '" type="text" value="' + escAttr(plan.btnText) + '" placeholder="Contratar"></div>' +

                    '<div class="field-group"><label class="field-label">Destaque?</label>' +
                    '<select class="field-input" id="planFeatured_' + plan.id + '">' +
                        '<option value="false"' + (!plan.featured ? ' selected' : '') + '>Normal</option>' +
                        '<option value="true"' + (plan.featured ? ' selected' : '') + '>⭐ Destaque (Mais Popular)</option>' +
                    '</select></div>' +
                '</div>' +
                '<div class="field-group"><label class="field-label">Benefícios (um por linha)</label>' +
                '<textarea class="field-input" id="planBenefits_' + plan.id + '" style="min-height:100px" placeholder="Benefit 1&#10;Benefit 2">' + escHtml(benefitsText) + '</textarea></div>' +

                '<div style="display:flex;gap:8px;margin-top:4px">' +
                    '<button class="btn btn-primary" style="flex:1" onclick="savePlan(\'' + plan.id + '\')">💾 Salvar Plano</button>' +
                    (i > 0 ? '<button class="btn btn-secondary" onclick="movePlan(\'' + plan.id + '\',-1)">↑</button>' : '') +
                    (i < cmsData.plans.length - 1 ? '<button class="btn btn-secondary" onclick="movePlan(\'' + plan.id + '\',1)">↓</button>' : '') +
                '</div>' +
            '</div>';

        list.appendChild(item);
    });

    if (cmsData.plans.length === 0) {
        list.innerHTML = '<div class="state-box">Nenhum plano cadastrado. Clique em "+ Novo Plano" para adicionar.</div>';
    }
}

function addPlan() {
    var id = 'p' + Date.now();
    cmsData.plans.push({ id: id, name: 'Novo Plano', price: 'R$ 0,00/mês', btnText: 'Contratar', benefits: ['Benefício 1', 'Benefício 2'], featured: false });
    cmsSave();
    renderPlans();
    addHistoryEntry('change', 'Adicionou novo plano');
    showToast('Novo plano adicionado!');
    // Open accordion
    setTimeout(function() { toggleAccordion('planBody_' + id); }, 100);
}

function savePlan(id) {
    var plan = cmsData.plans.find(function(p) { return p.id === id; });
    if (!plan) return;

    var prev = JSON.parse(JSON.stringify(cmsData.plans));
    pushUndo('plans', prev, 'Editou plano: ' + plan.name);

    plan.name     = getVal('planName_' + id)     || plan.name;
    plan.price    = getVal('planPrice_' + id)    || plan.price;
    plan.btnText  = getVal('planBtn_' + id)      || plan.btnText;
    plan.featured = getVal('planFeatured_' + id) === 'true';

    var benefitsRaw = getVal('planBenefits_' + id);
    if (benefitsRaw) {
        plan.benefits = benefitsRaw.split('\n').map(function(b) { return b.trim(); }).filter(Boolean);
    }

    cmsSave();
    cmsApplyPlans();
    renderPlans();
    showToast('✅ Plano "' + plan.name + '" salvo!');
}

function removePlan(id) {
    if (!confirm('Remover este plano?')) return;
    var prev = JSON.parse(JSON.stringify(cmsData.plans));
    pushUndo('plans', prev, 'Removeu plano');
    cmsData.plans = cmsData.plans.filter(function(p) { return p.id !== id; });
    cmsSave();
    cmsApplyPlans();
    renderPlans();
    showToast('🗑️ Plano removido.');
}

function movePlan(id, dir) {
    var idx = cmsData.plans.findIndex(function(p) { return p.id === id; });
    var newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= cmsData.plans.length) return;
    var tmp = cmsData.plans[idx]; cmsData.plans[idx] = cmsData.plans[newIdx]; cmsData.plans[newIdx] = tmp;
    cmsSave(); renderPlans(); cmsApplyPlans();
}

// ═══════════════════════════════════════════════════════════════
// 10. BENEFITS SECTION
// ═══════════════════════════════════════════════════════════════

var BENEFIT_ICONS = ['⚡','🔒','📞','🌐','🚀','💎','🔧','📡','🎯','💡','🏆','✅','🔑','🛡️','📱','🖥️','💻','🎵','📶','🌟'];

function renderBenefits() {
    var list = document.getElementById('benefitsList');
    if (!list) return;

    list.innerHTML = '';
    cmsData.benefits.forEach(function(bf, i) {
        var item = document.createElement('div');
        item.className = 'sortable-item';
        item.id = 'bfItem_' + bf.id;

        item.innerHTML =
            '<div class="sortable-item-head" onclick="toggleAccordion(\'bfBody_' + bf.id + '\')">' +
                '<span class="sortable-drag">⠿</span>' +
                '<span style="font-size:20px;line-height:1">' + bf.icon + '</span>' +
                '<span class="sortable-item-title">' + escHtml(bf.title) + '</span>' +
                '<div class="sortable-item-actions">' +
                    '<button class="btn btn-danger" style="font-size:11px;padding:4px 8px" onclick="event.stopPropagation();removeBenefit(\'' + bf.id + '\')">✕</button>' +
                '</div>' +
            '</div>' +
            '<div class="sortable-item-body" id="bfBody_' + bf.id + '">' +
                '<div class="grid-2">' +
                    '<div class="field-group"><label class="field-label">Título</label>' +
                    '<input class="field-input" id="bfTitle_' + bf.id + '" type="text" value="' + escAttr(bf.title) + '" placeholder="Ex: Alta Velocidade"></div>' +

                    '<div class="field-group"><label class="field-label">Ícone (emoji)</label>' +
                    '<input class="field-input" id="bfIcon_' + bf.id + '" type="text" value="' + escAttr(bf.icon) + '" placeholder="⚡" style="font-size:20px;text-align:center"></div>' +
                '</div>' +
                '<div class="field-group"><label class="field-label">Descrição</label>' +
                '<textarea class="field-input" id="bfDesc_' + bf.id + '" placeholder="Descreva este benefício...">' + escHtml(bf.desc) + '</textarea></div>' +

                '<div class="field-group"><label class="field-label">Ícones Rápidos</label>' +
                '<div class="icon-grid">' +
                    BENEFIT_ICONS.map(function(ic) {
                        return '<div class="icon-option' + (ic === bf.icon ? ' selected' : '') + '" onclick="selectIcon(\'' + bf.id + '\',\'' + ic + '\')">' + ic + '</div>';
                    }).join('') +
                '</div></div>' +

                '<div style="display:flex;gap:8px;margin-top:4px">' +
                    '<button class="btn btn-primary" style="flex:1" onclick="saveBenefit(\'' + bf.id + '\')">💾 Salvar Card</button>' +
                    (i > 0 ? '<button class="btn btn-secondary" onclick="moveBenefit(\'' + bf.id + '\',-1)">↑</button>' : '') +
                    (i < cmsData.benefits.length - 1 ? '<button class="btn btn-secondary" onclick="moveBenefit(\'' + bf.id + '\',1)">↓</button>' : '') +
                '</div>' +
            '</div>';

        list.appendChild(item);
    });

    if (cmsData.benefits.length === 0) {
        list.innerHTML = '<div class="state-box">Nenhum card. Clique em "+ Novo Card".</div>';
    }
}

function selectIcon(bfId, icon) {
    var input = document.getElementById('bfIcon_' + bfId);
    if (input) input.value = icon;
    // Update selected state
    var body = document.getElementById('bfBody_' + bfId);
    if (body) {
        body.querySelectorAll('.icon-option').forEach(function(el) {
            el.classList.toggle('selected', el.textContent === icon);
        });
    }
}

function addBenefit() {
    var id = 'bf' + Date.now();
    cmsData.benefits.push({ id: id, icon: '⭐', title: 'Novo Benefício', desc: 'Descrição do benefício.' });
    cmsSave();
    renderBenefits();
    addHistoryEntry('change', 'Adicionou benefício');
    showToast('Novo card adicionado!');
    setTimeout(function() { toggleAccordion('bfBody_' + id); }, 100);
}

function saveBenefit(id) {
    var bf = cmsData.benefits.find(function(b) { return b.id === id; });
    if (!bf) return;

    var prev = JSON.parse(JSON.stringify(cmsData.benefits));
    pushUndo('benefits', prev, 'Editou benefício: ' + bf.title);

    bf.title = getVal('bfTitle_' + id) || bf.title;
    bf.icon  = getVal('bfIcon_'  + id) || bf.icon;
    bf.desc  = getVal('bfDesc_'  + id) || bf.desc;

    cmsSave();
    cmsApplyBenefits();
    renderBenefits();
    showToast('✅ Card "' + bf.title + '" salvo!');
}

function removeBenefit(id) {
    if (!confirm('Remover este card?')) return;
    var prev = JSON.parse(JSON.stringify(cmsData.benefits));
    pushUndo('benefits', prev, 'Removeu benefício');
    cmsData.benefits = cmsData.benefits.filter(function(b) { return b.id !== id; });
    cmsSave();
    cmsApplyBenefits();
    renderBenefits();
    showToast('🗑️ Card removido.');
}

function moveBenefit(id, dir) {
    var idx = cmsData.benefits.findIndex(function(b) { return b.id === id; });
    var newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= cmsData.benefits.length) return;
    var tmp = cmsData.benefits[idx]; cmsData.benefits[idx] = cmsData.benefits[newIdx]; cmsData.benefits[newIdx] = tmp;
    cmsSave(); renderBenefits(); cmsApplyBenefits();
}

// ═══════════════════════════════════════════════════════════════
// 11. BANNERS / CAROUSEL
// ═══════════════════════════════════════════════════════════════

function renderAdminBanners() {
    var list = document.getElementById('adminBannerList');
    if (!list) return;

    list.innerHTML = '';

    if (cmsData.banners.length === 0) {
        list.innerHTML = '<div class="state-box">Nenhum banner. Clique em "+ Novo Banner".</div>';
        return;
    }

    cmsData.banners.forEach(function(banner, i) {
        var item = document.createElement('div');
        item.className = 'sortable-item';
        item.id = 'adminBannerItem_' + banner.id;

        item.innerHTML =
            '<div class="sortable-item-head" onclick="toggleAccordion(\'bannerBody_' + banner.id + '\')">' +
                '<span class="sortable-drag">⠿</span>' +
                '<span class="sortable-item-title">Banner ' + (i+1) + ': ' + escHtml(banner.title) + '</span>' +
                '<div class="sortable-item-actions">' +
                    (i > 0 ? '<button class="btn-icon" onclick="event.stopPropagation();moveBanner(\'' + banner.id + '\',-1)" title="Subir" style="font-size:12px">↑</button>' : '') +
                    (i < cmsData.banners.length-1 ? '<button class="btn-icon" onclick="event.stopPropagation();moveBanner(\'' + banner.id + '\',1)" title="Descer" style="font-size:12px">↓</button>' : '') +
                    '<button class="btn btn-danger" style="font-size:11px;padding:4px 8px" onclick="event.stopPropagation();deleteBanner(\'' + banner.id + '\')">✕</button>' +
                '</div>' +
            '</div>' +
            '<div class="sortable-item-body" id="bannerBody_' + banner.id + '">' +
                '<div class="grid-2">' +
                    '<div class="field-group"><label class="field-label">Título</label>' +
                    '<input class="field-input" id="bTitle_' + banner.id + '" type="text" value="' + escAttr(banner.title) + '" placeholder="Título do banner"></div>' +

                    '<div class="field-group"><label class="field-label">Preço / CTA</label>' +
                    '<input class="field-input" id="bPrice_' + banner.id + '" type="text" value="' + escAttr(banner.price) + '" placeholder="R$ 0,00"></div>' +
                '</div>' +
                '<div class="field-group"><label class="field-label">Descrição</label>' +
                '<textarea class="field-input" id="bDesc_' + banner.id + '" placeholder="Descrição">' + escHtml(banner.desc) + '</textarea></div>' +

                '<div class="field-group"><label class="field-label">Imagem (URL)</label>' +
                '<input class="field-input" id="bImg_' + banner.id + '" type="text" value="' + escAttr(banner.img || '') + '" placeholder="https://..."></div>' +

                '<div class="field-group"><label class="field-label">Ou fazer upload</label>' +
                '<div class="upload-box" onclick="document.getElementById(\'bImgFile_' + banner.id + '\').click()">' +
                    '📷 Clique para upload de imagem<br><small style="color:var(--text3)">JPG, PNG, WebP</small>' +
                    '<input type="file" id="bImgFile_' + banner.id + '" accept="image/*" style="display:none" onchange="uploadBannerImg(\'' + banner.id + '\',this)">' +
                '</div></div>' +

                '<button class="btn btn-primary btn-full" onclick="saveBanner(\'' + banner.id + '\')">💾 Salvar Banner</button>' +
            '</div>';

        list.appendChild(item);
    });
}

function addBanner() {
    var id = 'b' + Date.now();
    cmsData.banners.push({ id: id, title: 'Novo Banner', desc: 'Descrição do banner', price: 'Consulte', img: '' });
    cmsSave();
    renderAdminBanners();
    addHistoryEntry('change', 'Adicionou banner');
    showToast('Banner adicionado!');
    setTimeout(function() { toggleAccordion('bannerBody_' + id); }, 100);
}

function saveBanner(id) {
    var b = cmsData.banners.find(function(x) { return x.id === id; });
    if (!b) return;

    var prev = JSON.parse(JSON.stringify(cmsData.banners));
    pushUndo('banners', prev, 'Editou banner: ' + b.title);

    b.title = getVal('bTitle_' + id) || b.title;
    b.desc  = getVal('bDesc_'  + id) || b.desc;
    b.price = getVal('bPrice_' + id) || b.price;
    var imgUrl = getVal('bImg_' + id);
    if (imgUrl && imgUrl !== '[imagem carregada]') b.img = imgUrl;

    cmsSave();
    cmsApplyBanners();
    renderAdminBanners();
    showToast('✅ Banner salvo!');
}

function deleteBanner(id) {
    if (!confirm('Remover este banner?')) return;
    var prev = JSON.parse(JSON.stringify(cmsData.banners));
    pushUndo('banners', prev, 'Removeu banner');
    cmsData.banners = cmsData.banners.filter(function(b) { return b.id !== id; });
    cmsSave();
    cmsApplyBanners();
    renderAdminBanners();
    showToast('🗑️ Banner removido.');
}

function moveBanner(id, dir) {
    var idx = cmsData.banners.findIndex(function(b) { return b.id === id; });
    var newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= cmsData.banners.length) return;
    var tmp = cmsData.banners[idx]; cmsData.banners[idx] = cmsData.banners[newIdx]; cmsData.banners[newIdx] = tmp;
    cmsSave(); cmsApplyBanners(); renderAdminBanners();
}

function uploadBannerImg(id, input) {
    var file = input.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(e) {
        // Comprimir imagem via canvas antes de salvar (evita estourar localStorage)
        var img = new Image();
        img.onload = function() {
            var canvas = document.createElement('canvas');
            // Limitar a 1200px de largura mantendo proporção
            var maxW = 1200;
            var scale = img.width > maxW ? maxW / img.width : 1;
            canvas.width  = Math.round(img.width  * scale);
            canvas.height = Math.round(img.height * scale);
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // Qualidade 0.75 = boa qualidade visual com tamanho ~4x menor
            var compressed = canvas.toDataURL('image/jpeg', 0.75);

            var b = cmsData.banners.find(function(x) { return x.id === id; });
            if (b) { b.img = compressed; }
            var urlInput = document.getElementById('bImg_' + id);
            if (urlInput) urlInput.value = '[imagem carregada]';

            // Verificar tamanho total antes de salvar
            try {
                var testData = JSON.stringify(cmsData);
                if (testData.length > 4 * 1024 * 1024) {
                    showToast('⚠️ Imagens muito grandes! Use URLs externas ou imagens menores.', 'warn');
                    return;
                }
            } catch(e) {}

            cmsSave();
            cmsApplyBanners();
            renderAdminBanners();
            showToast('✅ Imagem carregada!');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ═══════════════════════════════════════════════════════════════
// 12. SECTION TEXTS
// ═══════════════════════════════════════════════════════════════

function populateSectionTextsFields() {
    var t = cmsData.sectionTexts;
    setVal('txtPlanosTitle',          t.planosTitle);
    setVal('txtPlanosSubtitle',       t.planosSubtitle);
    setVal('txtBeneficiosTitle',      t.beneficiosTitle);
    setVal('txtBeneficiosSubtitle',   t.beneficiosSubtitle);
    setVal('txtContatoTitle',         t.contatoTitle);
    setVal('txtContatoText',          t.contatoText);
    setVal('txtFooter',               t.footer);
    setVal('txtCopyright',            t.copyright);
}

function saveSectionTexts() {
    var prev = JSON.parse(JSON.stringify(cmsData.sectionTexts));
    pushUndo('sectionTexts', prev, 'Editou textos gerais');

    var t = cmsData.sectionTexts;
    t.planosTitle         = getVal('txtPlanosTitle')        || t.planosTitle;
    t.planosSubtitle      = getVal('txtPlanosSubtitle')     || t.planosSubtitle;
    t.beneficiosTitle     = getVal('txtBeneficiosTitle')    || t.beneficiosTitle;
    t.beneficiosSubtitle  = getVal('txtBeneficiosSubtitle') || t.beneficiosSubtitle;
    t.contatoTitle        = getVal('txtContatoTitle')       || t.contatoTitle;
    t.contatoText         = getVal('txtContatoText')        || t.contatoText;
    t.footer              = getVal('txtFooter')             || t.footer;
    t.copyright           = getVal('txtCopyright')          || t.copyright;

    cmsSave();
    cmsApplySectionTexts();
    showToast('✅ Textos salvos!');
}

// ═══════════════════════════════════════════════════════════════
// 13. RESET
// ═══════════════════════════════════════════════════════════════

function resetSection(section) {
    if (!confirm('Resetar "' + section + '" para os valores padrão?')) return;
    var prev = JSON.parse(JSON.stringify(cmsData[section]));
    pushUndo(section, prev, 'Resetou seção: ' + section);

    cmsData[section] = JSON.parse(JSON.stringify(cmsDefaults[section]));
    cmsSave();
    cmsApplyAll();

    // Repopulate fields
    if (section === 'header')       { populateHeaderFields(); }
    if (section === 'hero')         { populateHeroFields(); }
    if (section === 'plans')        { renderPlans(); }
    if (section === 'benefits')     { renderBenefits(); }
    if (section === 'banners')      { renderAdminBanners(); }
    if (section === 'sectionTexts') { populateSectionTextsFields(); }

    addHistoryEntry('reset', 'Resetou: ' + section);
    showToast('↺ Seção "' + section + '" restaurada ao padrão!');
}

function resetToDefaults() {
    if (!confirm('ATENÇÃO: Isso vai resetar TODO o conteúdo do site para os valores padrão. Deseja continuar?')) return;
    var prev = JSON.parse(JSON.stringify(cmsData));
    cmsData = JSON.parse(JSON.stringify(cmsDefaults));
    undoStack.push({ section: '__all__', prev: prev, desc: 'Reset completo' });
    cmsSave();
    cmsApplyAll();
    populateHeaderFields();
    populateHeroFields();
    renderPlans();
    renderBenefits();
    renderAdminBanners();
    populateSectionTextsFields();
    addHistoryEntry('reset', 'Reset completo do site');
    showToast('↺ Site restaurado ao padrão!');
}

// Override setSection for __all__
var _origSetSection = setSection;
setSection = function(key, value) {
    if (key === '__all__') {
        cmsData = JSON.parse(JSON.stringify(value));
        cmsSave();
        cmsApplyAll();
        populateHeaderFields();
        populateHeroFields();
        renderPlans();
        renderBenefits();
        renderAdminBanners();
        populateSectionTextsFields();
    } else {
        _origSetSection(key, value);
    }
};

// ═══════════════════════════════════════════════════════════════
// 14. LEGACY FUNCTIONS (compatibility with public.js / admin.html)
// ═══════════════════════════════════════════════════════════════

function saveTexts() {
    saveHeader();
}

// ═══════════════════════════════════════════════════════════════
// 15. UI UTILS
// ═══════════════════════════════════════════════════════════════

function toggleAccordion(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('open');
}

function getVal(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
}

function setVal(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val || '';
}

function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escAttr(str) {
    return String(str || '').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// Compatibility — clear queue with confirm modal
function clearQueueWithConfirm() {
    if (typeof showConfirmModal === 'function') {
        showConfirmModal('Limpar Fila', 'Remove todas as músicas da fila de reprodução. Esta ação não pode ser desfeita.', 'Sim, limpar', function() {
            if (typeof queue !== 'undefined') queue.length = 0;
            if (typeof saveState === 'function') saveState();
            if (typeof renderQueue === 'function') renderQueue();
            updateDashboard();
            addHistoryEntry('clear', 'Limpou fila de músicas');
            showToast('Fila limpa.');
        });
    } else {
        if (confirm('Limpar fila?')) {
            if (typeof queue !== 'undefined') queue.length = 0;
            if (typeof saveState === 'function') saveState();
            if (typeof renderQueue === 'function') renderQueue();
            updateDashboard();
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// 16. KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════

document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        performUndo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        performRedo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        cmsSave();
        showToast('💾 Dados salvos! (Ctrl+S)');
    }
});

// ═══════════════════════════════════════════════════════════════
// 17. INIT
// ═══════════════════════════════════════════════════════════════

function cmsInit() {
    cmsLoad();

    // Populate all admin fields
    populateHeaderFields();
    populateHeroFields();
    renderPlans();
    renderBenefits();
    renderAdminBanners();
    populateSectionTextsFields();
    renderHistory();
    updateUndoRedoUI();

    // Apply to site
    cmsApplyAll();

    console.log('%c🎛️ CMS Engine v4.0 iniciado', 'color:#10b981;font-weight:bold');
}

// Auto-init if DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cmsInit);
} else {
    setTimeout(cmsInit, 200);
}