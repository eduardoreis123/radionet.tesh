/* =====================================================
   RADIONETWAY.TECH — admin-history.js v1.0
   Sistema de Controle de Alterações / Histórico Admin
   ===================================================== */

'use strict';

// ══════════════════════════════════════════════════════
// CONSTANTES & DEFAULTS
// ══════════════════════════════════════════════════════

var HISTORY_KEY     = 'rnw_change_history';
var HISTORY_MAX     = 50;   // máximo de entradas no histórico
var UNDO_STACK_MAX  = 30;   // máximo de snapshots no undo stack

var DEFAULT_SITE_DATA = {
    companyName: 'RadioNetway.Tech',
    slogan:      'Conectando você ao mundo!',
    whatsapp:    '5500000000000',
    banners: [
        { id: 'b1', title: 'Internet de Alta Velocidade',   desc: 'Planos a partir de R$ 79,90/mês. Fibra óptica com instalação grátis!', price: 'R$ 79,90/mês', img: '' },
        { id: 'b2', title: 'Suporte Técnico Especializado', desc: 'Assistência técnica para computadores, notebooks e redes.',             price: 'Sob consulta',  img: '' },
        { id: 'b3', title: 'Soluções em TI para Empresas', desc: 'Infraestrutura, segurança e suporte corporativo completo.',             price: 'Consulte-nos',  img: '' }
    ]
};

// ══════════════════════════════════════════════════════
// UNDO STACK (memória de estados em runtime)
// ══════════════════════════════════════════════════════

var undoStack  = [];   // pilha de snapshots { label, siteData, queueSnap, timestamp }
var redoStack  = [];   // pilha para redo

// Tira snapshot do estado atual antes de qualquer alteração
function takeSnapshot(label) {
    // Clonar profundamente os dados relevantes
    var snap = {
        label:     label || 'Alteração',
        timestamp: Date.now(),
        siteData:  JSON.parse(JSON.stringify(
            (typeof siteData !== 'undefined') ? siteData : DEFAULT_SITE_DATA
        )),
        queue: (typeof queue !== 'undefined') ? JSON.parse(JSON.stringify(queue)) : []
    };

    undoStack.push(snap);
    if (undoStack.length > UNDO_STACK_MAX) undoStack.shift();

    // Qualquer nova ação limpa o redo
    redoStack = [];

    // Registrar no histórico persistente
    pushHistory({ type: 'change', label: label, timestamp: snap.timestamp });

    renderHistoryPanel();
    updateUndoRedoButtons();
}

// ══════════════════════════════════════════════════════
// HISTÓRICO PERSISTENTE (localStorage)
// ══════════════════════════════════════════════════════

var changeHistory = [];  // array de { type, label, timestamp, id }

function loadHistory() {
    try {
        var raw = localStorage.getItem(HISTORY_KEY);
        if (raw) changeHistory = JSON.parse(raw);
    } catch(e) { changeHistory = []; }
}

function saveHistory() {
    try {
        if (changeHistory.length > HISTORY_MAX) changeHistory = changeHistory.slice(-HISTORY_MAX);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(changeHistory));
    } catch(e) {}
}

function pushHistory(entry) {
    entry.id = 'h' + Date.now() + Math.random().toString(36).slice(2, 6);
    changeHistory.push(entry);
    saveHistory();
}

function clearHistory() {
    changeHistory = [];
    saveHistory();
    renderHistoryPanel();
    showAdminToast('🗑️ Histórico limpo.');
}

// ══════════════════════════════════════════════════════
// UNDO / REDO
// ══════════════════════════════════════════════════════

function performUndo() {
    if (undoStack.length === 0) {
        showAdminToast('⚠️ Nada para desfazer.');
        return;
    }
    // Salvar estado atual no redo antes de voltar
    var currentSnap = {
        label:     'Estado antes de desfazer',
        timestamp: Date.now(),
        siteData:  JSON.parse(JSON.stringify(
            (typeof siteData !== 'undefined') ? siteData : DEFAULT_SITE_DATA
        )),
        queue: (typeof queue !== 'undefined') ? JSON.parse(JSON.stringify(queue)) : []
    };
    redoStack.push(currentSnap);

    var snap = undoStack.pop();
    applySnapshot(snap);

    pushHistory({ type: 'undo', label: 'Desfeito: ' + snap.label, timestamp: Date.now() });
    showAdminToast('↩️ Desfeito: ' + snap.label);
    renderHistoryPanel();
    updateUndoRedoButtons();
}

function performRedo() {
    if (redoStack.length === 0) {
        showAdminToast('⚠️ Nada para refazer.');
        return;
    }
    // Salvar estado atual no undo
    var currentSnap = {
        label:     'Estado antes de refazer',
        timestamp: Date.now(),
        siteData:  JSON.parse(JSON.stringify(
            (typeof siteData !== 'undefined') ? siteData : DEFAULT_SITE_DATA
        )),
        queue: (typeof queue !== 'undefined') ? JSON.parse(JSON.stringify(queue)) : []
    };
    undoStack.push(currentSnap);

    var snap = redoStack.pop();
    applySnapshot(snap);

    pushHistory({ type: 'redo', label: 'Refeito: ' + snap.label, timestamp: Date.now() });
    showAdminToast('↪️ Refeito: ' + snap.label);
    renderHistoryPanel();
    updateUndoRedoButtons();
}

function applySnapshot(snap) {
    // Restaurar siteData global
    if (typeof siteData !== 'undefined' && snap.siteData) {
        siteData.companyName = snap.siteData.companyName;
        siteData.slogan      = snap.siteData.slogan;
        siteData.whatsapp    = snap.siteData.whatsapp;
        siteData.banners     = JSON.parse(JSON.stringify(snap.siteData.banners));
        if (typeof saveSiteData  === 'function') saveSiteData();
        if (typeof applySiteData === 'function') applySiteData();
        if (typeof renderCarousel === 'function') renderCarousel();
        if (typeof refreshAdminPanel === 'function') refreshAdminPanel();
    }

    // Restaurar fila (queue) se o script.js expõe ela globalmente
    if (typeof queue !== 'undefined' && Array.isArray(snap.queue)) {
        // Limpar e repopular a fila sem perder o player ativo
        queue.length = 0;
        snap.queue.forEach(function(item) { queue.push(item); });
        if (typeof renderQueue === 'function') renderQueue();
    }
}

// ══════════════════════════════════════════════════════
// RESET PARA PADRÕES
// ══════════════════════════════════════════════════════

function resetToDefaults() {
    showConfirmModal(
        'Resetar para Padrão',
        'Isso vai restaurar o nome da empresa, slogan, WhatsApp e banners para os valores originais. A fila de músicas também será limpa. Deseja continuar?',
        'Sim, resetar tudo',
        function() {
            takeSnapshot('Antes do reset para padrão');

            // Restaurar siteData
            if (typeof siteData !== 'undefined') {
                siteData.companyName = DEFAULT_SITE_DATA.companyName;
                siteData.slogan      = DEFAULT_SITE_DATA.slogan;
                siteData.whatsapp    = DEFAULT_SITE_DATA.whatsapp;
                siteData.banners     = JSON.parse(JSON.stringify(DEFAULT_SITE_DATA.banners));
                if (typeof saveSiteData   === 'function') saveSiteData();
                if (typeof applySiteData  === 'function') applySiteData();
                if (typeof renderCarousel === 'function') renderCarousel();
                if (typeof refreshAdminPanel === 'function') refreshAdminPanel();
            }

            // Limpar fila
            if (typeof clearQueue === 'function') clearQueue(true /* silently */);

            pushHistory({ type: 'reset', label: 'Reset para padrão', timestamp: Date.now() });
            renderHistoryPanel();
            showAdminToast('✅ Sistema resetado para os valores padrão!');
        }
    );
}

// ══════════════════════════════════════════════════════
// LIMPEZAS ESPECÍFICAS
// ══════════════════════════════════════════════════════

function clearQueueWithConfirm() {
    if (typeof queue !== 'undefined' && queue.length === 0) {
        showAdminToast('⚠️ A fila já está vazia.');
        return;
    }
    showConfirmModal(
        'Limpar Fila',
        'Tem certeza que deseja limpar toda a fila de músicas? Esta ação pode ser desfeita.',
        'Sim, limpar fila',
        function() {
            takeSnapshot('Limpeza da fila');
            if (typeof clearQueue === 'function') clearQueue();
            pushHistory({ type: 'clear', label: 'Fila de músicas limpa', timestamp: Date.now() });
            renderHistoryPanel();
            showAdminToast('🗑️ Fila limpa! Use Desfazer se precisar.');
        }
    );
}

function clearCurrentTrack() {
    showConfirmModal(
        'Remover Música Atual',
        'Deseja parar e remover a música que está tocando no momento?',
        'Sim, remover',
        function() {
            takeSnapshot('Remoção da música atual');
            if (typeof toggleRadio !== 'undefined' && typeof radioActive !== 'undefined' && radioActive) {
                if (typeof toggleRadio === 'function') toggleRadio();
            }
            pushHistory({ type: 'clear', label: 'Música atual removida', timestamp: Date.now() });
            renderHistoryPanel();
            showAdminToast('⏹️ Música atual removida.');
        }
    );
}

function clearCustomTexts() {
    showConfirmModal(
        'Apagar Textos Personalizados',
        'Isso vai limpar o nome da empresa, slogan e número de WhatsApp personalizados, voltando para os valores padrão apenas dos textos.',
        'Sim, apagar textos',
        function() {
            takeSnapshot('Limpeza de textos personalizados');
            if (typeof siteData !== 'undefined') {
                siteData.companyName = DEFAULT_SITE_DATA.companyName;
                siteData.slogan      = DEFAULT_SITE_DATA.slogan;
                siteData.whatsapp    = DEFAULT_SITE_DATA.whatsapp;
                if (typeof saveSiteData   === 'function') saveSiteData();
                if (typeof applySiteData  === 'function') applySiteData();
                if (typeof refreshAdminPanel === 'function') refreshAdminPanel();
            }
            pushHistory({ type: 'clear', label: 'Textos personalizados apagados', timestamp: Date.now() });
            renderHistoryPanel();
            showAdminToast('🗑️ Textos restaurados para o padrão.');
        }
    );
}

// ══════════════════════════════════════════════════════
// MODAL DE CONFIRMAÇÃO
// ══════════════════════════════════════════════════════

function showConfirmModal(title, message, confirmLabel, onConfirm) {
    var existing = document.getElementById('histConfirmModal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'histConfirmModal';
    modal.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:99999',
        'display:flex', 'align-items:center', 'justify-content:center',
        'background:rgba(0,0,0,0.55)', 'backdrop-filter:blur(4px)',
        'animation:histFadeIn 0.18s ease'
    ].join(';');

    modal.innerHTML =
        '<div style="' + [
            'background:#fff', 'border-radius:18px', 'padding:32px 28px',
            'max-width:420px', 'width:92vw', 'box-shadow:0 20px 60px rgba(107,33,232,0.22)',
            'animation:histSlideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)',
            'font-family:Inter,sans-serif'
        ].join(';') + '">' +
            '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">' +
                '<div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#7C3AED,#9333EA);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
                    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
                '</div>' +
                '<h3 style="font-family:Barlow,sans-serif;font-size:18px;font-weight:800;color:#1e1b4b;margin:0;">' + escHtml(title) + '</h3>' +
            '</div>' +
            '<p style="font-size:14px;color:#6b7280;line-height:1.65;margin-bottom:24px;">' + escHtml(message) + '</p>' +
            '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
                '<button id="histConfirmCancel" style="' + [
                    'font-size:13px;font-weight:600;color:#4c4480;',
                    'background:#f5f3ff;border:1px solid rgba(107,33,232,0.2);',
                    'padding:10px 20px;border-radius:9px;cursor:pointer;transition:all 0.2s;font-family:inherit'
                ].join('') + '">Cancelar</button>' +
                '<button id="histConfirmOk" style="' + [
                    'font-size:13px;font-weight:700;color:#fff;',
                    'background:linear-gradient(135deg,#7C3AED,#9333EA);',
                    'border:none;padding:10px 20px;border-radius:9px;cursor:pointer;',
                    'box-shadow:0 4px 14px rgba(107,33,232,0.3);transition:all 0.2s;font-family:inherit'
                ].join('') + '">' + escHtml(confirmLabel) + '</button>' +
            '</div>' +
        '</div>';

    document.body.appendChild(modal);

    document.getElementById('histConfirmCancel').onclick = function() { modal.remove(); };
    document.getElementById('histConfirmOk').onclick     = function() {
        modal.remove();
        onConfirm();
    };

    // Fechar no backdrop
    modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
}

function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════════════
// RENDERIZAÇÃO DO PAINEL DE HISTÓRICO
// ══════════════════════════════════════════════════════

function renderHistoryPanel() {
    var container = document.getElementById('historyList');
    if (!container) return;

    var entries = changeHistory.slice().reverse();  // mais recentes primeiro

    if (entries.length === 0) {
        container.innerHTML =
            '<div class="hist-empty">' +
                '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
                '<span>Nenhuma alteração registrada ainda.</span>' +
            '</div>';
        return;
    }

    container.innerHTML = entries.slice(0, 40).map(function(entry, i) {
        var icon  = histIcon(entry.type);
        var color = histColor(entry.type);
        var time  = formatTime(entry.timestamp);
        return (
            '<div class="hist-item" data-id="' + escHtml(entry.id || '') + '">' +
                '<div class="hist-item-icon" style="background:' + color.bg + ';color:' + color.fg + '">' + icon + '</div>' +
                '<div class="hist-item-body">' +
                    '<div class="hist-item-label">' + escHtml(entry.label || 'Alteração') + '</div>' +
                    '<div class="hist-item-time">' + time + '</div>' +
                '</div>' +
                '<div class="hist-item-badge hist-badge--' + escHtml(entry.type) + '">' + histBadge(entry.type) + '</div>' +
            '</div>'
        );
    }).join('');

    updateUndoRedoButtons();
}

function histIcon(type) {
    var icons = {
        change: '✏️',
        undo:   '↩️',
        redo:   '↪️',
        reset:  '🔄',
        clear:  '🗑️'
    };
    return icons[type] || '📝';
}
function histColor(type) {
    var colors = {
        change: { bg: 'rgba(107,33,232,0.1)',  fg: '#7C3AED' },
        undo:   { bg: 'rgba(245,158,11,0.1)',  fg: '#d97706' },
        redo:   { bg: 'rgba(59,130,246,0.1)',  fg: '#2563eb' },
        reset:  { bg: 'rgba(239,68,68,0.1)',   fg: '#dc2626' },
        clear:  { bg: 'rgba(107,114,128,0.1)', fg: '#4b5563' }
    };
    return colors[type] || colors.change;
}
function histBadge(type) {
    var labels = { change: 'Edição', undo: 'Desfeito', redo: 'Refeito', reset: 'Reset', clear: 'Limpeza' };
    return labels[type] || 'Ação';
}

function formatTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var now = new Date();
    var diffMs  = now - d;
    var diffSec = Math.floor(diffMs / 1000);
    var diffMin = Math.floor(diffSec / 60);
    var diffH   = Math.floor(diffMin / 60);

    if (diffSec < 10)  return 'agora mesmo';
    if (diffSec < 60)  return diffSec + 's atrás';
    if (diffMin < 60)  return diffMin + 'min atrás';
    if (diffH   < 24)  return diffH   + 'h atrás';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function updateUndoRedoButtons() {
    var undoBtn  = document.getElementById('btnUndo');
    var redoBtn  = document.getElementById('btnRedo');
    var undoInfo = document.getElementById('undoInfo');

    if (undoBtn) {
        var canUndo = undoStack.length > 0;
        undoBtn.disabled = !canUndo;
        undoBtn.style.opacity = canUndo ? '1' : '0.45';
        if (undoInfo) {
            undoInfo.textContent = canUndo
                ? undoStack.length + ' ação(ões) disponíveis'
                : 'Nada para desfazer';
        }
    }
    if (redoBtn) {
        var canRedo = redoStack.length > 0;
        redoBtn.disabled = !canRedo;
        redoBtn.style.opacity = canRedo ? '1' : '0.45';
    }
}

// ══════════════════════════════════════════════════════
// INTERCEPTAÇÃO DE AÇÕES EXISTENTES
// Wraps das funções do public.js para capturar snapshots
// ══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    // Esperar um tick para garantir que public.js já carregou
    setTimeout(function() {
        wrapExistingFunctions();
        loadHistory();
        renderHistoryPanel();
        updateUndoRedoButtons();
        refreshHistoryTimestamps();
    }, 200);
});

function wrapExistingFunctions() {
    // Wrap saveTexts
    if (typeof saveTexts === 'function' && !saveTexts._wrapped) {
        var origSaveTexts = saveTexts;
        saveTexts = function() {
            takeSnapshot('Textos da empresa alterados');
            origSaveTexts.apply(this, arguments);
        };
        saveTexts._wrapped = true;
    }

    // Wrap saveBanner
    if (typeof saveBanner === 'function' && !saveBanner._wrapped) {
        var origSaveBanner = saveBanner;
        saveBanner = function(id) {
            takeSnapshot('Banner editado (ID: ' + id + ')');
            origSaveBanner.apply(this, arguments);
        };
        saveBanner._wrapped = true;
    }

    // Wrap addBanner
    if (typeof addBanner === 'function' && !addBanner._wrapped) {
        var origAddBanner = addBanner;
        addBanner = function() {
            takeSnapshot('Novo banner adicionado');
            origAddBanner.apply(this, arguments);
        };
        addBanner._wrapped = true;
    }

    // Wrap deleteBanner
    if (typeof deleteBanner === 'function' && !deleteBanner._wrapped) {
        var origDeleteBanner = deleteBanner;
        deleteBanner = function(id) {
            takeSnapshot('Banner removido (ID: ' + id + ')');
            origDeleteBanner.apply(this, arguments);
        };
        deleteBanner._wrapped = true;
    }

    // Wrap clearQueue (do script.js)
    if (typeof clearQueue === 'function' && !clearQueue._wrapped) {
        var origClearQueue = clearQueue;
        clearQueue = function(silent) {
            if (!silent) takeSnapshot('Fila de músicas limpa');
            origClearQueue.apply(this, arguments);
            if (!silent) {
                pushHistory({ type: 'clear', label: 'Fila limpa manualmente', timestamp: Date.now() });
                renderHistoryPanel();
            }
        };
        clearQueue._wrapped = true;
    }
}

// Atualizar timestamps a cada minuto para "Xmin atrás"
function refreshHistoryTimestamps() {
    setInterval(function() {
        var panel = document.getElementById('histControlTab');
        if (panel && !panel.classList.contains('hidden')) renderHistoryPanel();
    }, 60000);
}

// ══════════════════════════════════════════════════════
// EXPORT HISTÓRICO
// ══════════════════════════════════════════════════════

function exportHistory() {
    var data = JSON.stringify(changeHistory, null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'radionetway-historico-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showAdminToast('📥 Histórico exportado!');
}