/* =====================================================
   RADIONETWAY.TECH — Script Principal
   Versão: 3.1 — Player YT corrigido
   ===================================================== */

'use strict';

// ─────────────────────────────────────────────────────
// 1. CONFIGURAÇÃO
// ─────────────────────────────────────────────────────
const API_KEY      = 'AIzaSyDgTteSqVFqLBUKXwI37dk9e0LBKNR-7KU';
const ADS_VIDEO_ID = 'dQw4w9WgXcQ';
const AD_INTERVAL  = 3;

// ─────────────────────────────────────────────────────
// 2. ESTADO GLOBAL
// ─────────────────────────────────────────────────────
let player           = null;
let playerReady      = false;
let queue            = [];
let currentIndex     = -1;
let radioActive      = false;
let songCount        = 0;
let isPlayingAd      = false;
let isMuted          = false;
let progressTimer    = null;
let adCountdownTimer = null;
let currentVolume    = 80;

// ─────────────────────────────────────────────────────
// 3. PERSISTÊNCIA (localStorage)
// ─────────────────────────────────────────────────────
function saveState() {
    try {
        localStorage.setItem('rnw_queue',  JSON.stringify(queue));
        localStorage.setItem('rnw_index',  currentIndex);
        localStorage.setItem('rnw_volume', currentVolume);
        localStorage.setItem('rnw_songs',  songCount);
    } catch(e) {}
}

function loadState() {
    try {
        const q = localStorage.getItem('rnw_queue');
        const i = localStorage.getItem('rnw_index');
        const v = localStorage.getItem('rnw_volume');
        const s = localStorage.getItem('rnw_songs');
        if (q) queue         = JSON.parse(q);
        if (i !== null) currentIndex  = parseInt(i, 10);
        if (v !== null) currentVolume = parseInt(v, 10);
        if (s !== null) songCount     = parseInt(s, 10);
    } catch(e) { queue = []; currentIndex = -1; }
}

// ─────────────────────────────────────────────────────
// BROADCAST — publica estado para o INDEX via localStorage
// ─────────────────────────────────────────────────────
function broadcastState(status, extraData) {
    try {
        var track    = (currentIndex >= 0 && currentIndex < queue.length) ? queue[currentIndex] : null;
        var elapsed  = 0;
        if (player && playerReady && typeof player.getCurrentTime === 'function') {
            try { elapsed = player.getCurrentTime() || 0; } catch(e) {}
        }
        var state = {
            status:    status || (radioActive ? 'playing' : 'paused'),
            videoId:   track ? track.id        : null,
            title:     track ? track.title     : 'Nenhuma música tocando',
            channel:   track ? track.channel   : 'RadioNetway.Tech',
            thumbnail: track ? track.thumbnail : '',
            elapsed:   elapsed,
            volume:    currentVolume,
            ts:        Date.now()
        };
        // Incluir dados do anuncio para o index tocar
        if (extraData) {
            state.adData = extraData.adData || null;
            state.adName = extraData.adName || '';
        }
        localStorage.setItem('rnw_broadcast', JSON.stringify(state));
    } catch(e) {}
}

// ─────────────────────────────────────────────────────
// 4. YOUTUBE IFRAME API
// ─────────────────────────────────────────────────────
(function injectYT() {
    const tag   = document.createElement('script');
    tag.src     = 'https://www.youtube.com/iframe_api';
    const first = document.getElementsByTagName('script')[0];
    first.parentNode.insertBefore(tag, first);
})();

window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player('ytPlayer', {
        width:  '100%',
        height: '100%',
        playerVars: {
            autoplay:       0,
            controls:       0,
            modestbranding: 1,
            rel:            0,
            enablejsapi:    1,
            playsinline:    1,
            origin:         window.location.origin
        },
        events: {
            onReady:       onPlayerReady,
            onStateChange: onPlayerStateChange,
            onError:       onPlayerError
        }
    });
};

function onPlayerReady(e) {
    playerReady = true;
    e.target.unMute();
    e.target.setVolume(currentVolume);

    const slider = document.getElementById('volumeSlider');
    if (slider) slider.value = currentVolume;

    if (queue.length > 0) {
        renderQueue();
        updateCounters();
        if (currentIndex >= 0 && currentIndex < queue.length) {
            updateNowPlaying(queue[currentIndex].title, queue[currentIndex].channel);
        }
    }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED && radioActive) {
        playNext();
    }
    if (event.data === YT.PlayerState.PLAYING) {
        startProgressTracking();
        updateRadioUI(true);
        broadcastState('playing');
    }
    if (event.data === YT.PlayerState.PAUSED) {
        stopProgressTracking();
        broadcastState('paused');
    }
}

function onPlayerError(e) {
    console.error('Erro no player YT:', e.data);
    showToast('Erro ao reproduzir. Pulando...');
    if (radioActive) setTimeout(playNext, 1500);
}

// ─────────────────────────────────────────────────────
// 5. BUSCA NO YOUTUBE
// ─────────────────────────────────────────────────────
async function searchVideos() {
    const input = document.getElementById('searchInput');
    const query = input.value.trim();
    if (!query) { showToast('Digite algo para pesquisar.'); return; }
    await searchYouTube(query);
}

async function searchYouTube(query) {
    showSearchState('loading');
    try {
        const endpoint = new URL('https://www.googleapis.com/youtube/v3/search');
        endpoint.searchParams.set('part',            'snippet');
        endpoint.searchParams.set('type',            'video');
        endpoint.searchParams.set('maxResults',      '15');
        endpoint.searchParams.set('videoEmbeddable', 'true');
        endpoint.searchParams.set('q',               query);
        endpoint.searchParams.set('key',             API_KEY);

        const res  = await fetch(endpoint.toString());
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        renderResults(data.items || [], query);
    } catch (err) {
        console.error('Erro na busca:', err);
        showSearchState('error', 'Erro: ' + err.message);
    }
}

function renderResults(items, query) {
    const list = document.getElementById('resultsList');
    list.innerHTML = '';

    if (!items.length) { showSearchState('empty'); return; }

    document.getElementById('resultsLabel').textContent =
        items.length + ' resultado' + (items.length !== 1 ? 's' : '') + ' para "' + query + '"';

    items.forEach(function(item, idx) {
        const videoId = item.id && item.id.videoId;
        if (!videoId) return;

        const rawTitle = (item.snippet && item.snippet.title)        || 'Sem título';
        const channel  = (item.snippet && item.snippet.channelTitle) || 'Canal desconhecido';
        const thumb    = (item.snippet && item.snippet.thumbnails && item.snippet.thumbnails.medium && item.snippet.thumbnails.medium.url)
                      || (item.snippet && item.snippet.thumbnails && item.snippet.thumbnails.default && item.snippet.thumbnails.default.url)
                      || '';

        const div = document.createElement('div');
        div.className = 'result-item';
        div.style.animationDelay = (idx * 0.04) + 's';

        div.innerHTML =
            '<img src="' + escapeAttr(thumb) + '" alt="" class="result-thumb" loading="lazy">' +
            '<div class="result-info">' +
              '<div class="result-title">'   + escapeHtml(rawTitle) + '</div>' +
              '<div class="result-channel">' + escapeHtml(channel)  + '</div>' +
            '</div>' +
            '<div class="result-actions">' +
              '<button class="btn-result btn-result--play"  data-action="play">&#9654; Tocar</button>' +
              '<button class="btn-result btn-result--queue" data-action="queue">+ Fila</button>' +
            '</div>';

        // Store raw data on element — no encoding issues
        div._track = { id: videoId, title: rawTitle, channel: channel, thumbnail: thumb };

        div.querySelectorAll('.btn-result').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var t = div._track;
                if (btn.dataset.action === 'play') playDirect(t.id, t.title, t.channel, t.thumbnail);
                else addToQueue(t.id, t.title, t.channel, t.thumbnail);
            });
        });

        list.appendChild(div);
    });

    showSearchState('results');
}

function showSearchState(state, msg) {
    var ids = { empty: 'emptyState', loading: 'loadingState', error: 'errorState', results: 'resultsSection' };
    Object.keys(ids).forEach(function(key) {
        var el = document.getElementById(ids[key]);
        if (el) el.classList.toggle('hidden', key !== state);
    });
    if (state === 'error' && msg) {
        document.getElementById('errorMsg').textContent = msg;
    }
}

function clearResults() {
    document.getElementById('resultsList').innerHTML = '';
    showSearchState('empty');
    document.getElementById('searchInput').value = '';
}

// ─────────────────────────────────────────────────────
// 6. FILA DE REPRODUÇÃO
// ─────────────────────────────────────────────────────
function addToQueue(id, title, channel, thumb) {
    queue.push({ id: id, title: title, channel: channel, thumbnail: thumb });
    saveState();
    renderQueue();
    showToast('"' + title.slice(0, 30) + '..." adicionado à fila');

    if (!radioActive) {
        if (currentIndex === -1) currentIndex = queue.length - 2;
        startRadio();
    } else if (currentIndex === -1) {
        playNext();
    }
}

function playDirect(id, title, channel, thumb) {
    queue.push({ id: id, title: title, channel: channel, thumbnail: thumb });
    currentIndex = queue.length - 2;
    saveState();
    renderQueue();
    if (!radioActive) {
        radioActive = true;
        updateRadioUI(true);
        var rm = document.getElementById('radioMessage');
        if (rm) rm.classList.remove('hidden');
    }
    playNext();
}

function renderQueue() {
    var list  = document.getElementById('queueList');
    var empty = document.getElementById('queueEmpty');
    var badge = document.getElementById('queueCount');

    if (!list) return;
    list.innerHTML = '';
    if (badge) badge.textContent = queue.length;

    if (queue.length === 0) {
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');

    queue.forEach(function(item, i) {
        var isCurrent = i === currentIndex;

        if (i > 0 && i % AD_INTERVAL === 0) {
            var divider = document.createElement('div');
            divider.className   = 'queue-ad-divider';
            divider.textContent = 'Anúncio aqui';
            list.appendChild(divider);
        }

        var div = document.createElement('div');
        div.className = 'queue-item' + (isCurrent ? ' queue-item--current' : '');
        div.style.animationDelay = (i * 0.03) + 's';
        div.innerHTML =
            '<span class="queue-num' + (isCurrent ? ' queue-num--playing' : '') + '">' +
                (isCurrent ? '&#9654;' : i + 1) +
            '</span>' +
            '<img src="' + escapeAttr(item.thumbnail) + '" alt="" class="queue-thumb">' +
            '<div class="queue-info">' +
                '<div class="queue-title-text">'   + escapeHtml(item.title)   + '</div>' +
                '<div class="queue-channel-text">' + escapeHtml(item.channel) + '</div>' +
            '</div>' +
            '<button class="queue-remove" data-index="' + i + '" title="Remover">&times;</button>';

        div.querySelector('.queue-remove').addEventListener('click', function() {
            removeFromQueue(parseInt(this.dataset.index, 10));
        });

        list.appendChild(div);
    });

    var currentEl = list.querySelector('.queue-item--current');
    if (currentEl) currentEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function removeFromQueue(index) {
    if (index === currentIndex) {
        showToast('Não é possível remover a música atual.');
        return;
    }
    queue.splice(index, 1);
    if (index < currentIndex) currentIndex--;
    saveState();
    renderQueue();
}

function clearQueue() {
    if (!confirm('Deseja limpar toda a fila de reprodução?')) return;
    queue        = [];
    currentIndex = -1;
    stopRadio();
    saveState();
    renderQueue();
    showToast('Fila limpa.');
}

// ─────────────────────────────────────────────────────
// 7. CONTROLES DA RÁDIO
// ─────────────────────────────────────────────────────
function toggleRadio() {
    if (radioActive) stopRadio();
    else startRadio();
}

function startRadio() {
    if (queue.length === 0) {
        showToast('Adicione músicas à fila primeiro.');
        return;
    }
    radioActive = true;
    updateRadioUI(true);
    var rm = document.getElementById('radioMessage');
    if (rm) rm.classList.remove('hidden');

    if (currentIndex === -1 || currentIndex >= queue.length) {
        currentIndex = -1;
        playNext();
    } else {
        playVideo(queue[currentIndex]);
    }
}

function stopRadio() {
    radioActive = false;
    isPlayingAd = false;
    stopProgressTracking();
    clearAdCountdown();

    if (player && playerReady) {
        try { player.stopVideo(); } catch(e) {}
    }
    updateRadioUI(false);
    var rm = document.getElementById('radioMessage');
    if (rm) rm.classList.add('hidden');
    resetProgress();
    broadcastState('stopped');
}

function playNext() {
    if (!player || !playerReady) {
        setTimeout(playNext, 500);
        return;
    }
    if (!radioActive) return;

    stopProgressTracking();
    clearAdCountdown();
    var ao = document.getElementById('adOverlay');
    if (ao) ao.classList.add('hidden');

    if (!isPlayingAd && songCount > 0 && songCount % AD_INTERVAL === 0) {
        playAd();
        return;
    }

    isPlayingAd = false;
    currentIndex++;

    if (currentIndex < queue.length) {
        playVideo(queue[currentIndex]);
    } else {
        showToast('Fim da fila de reprodução.');
        stopRadio();
        currentIndex = -1;
        saveState();
        updateNowPlaying('Nenhuma música selecionada', 'RadioNetway.Tech');
    }
}

function playPrev() {
    if (!player || !playerReady || !radioActive) return;
    if (currentIndex <= 0) { showToast('Esta é a primeira música.'); return; }

    stopProgressTracking();
    isPlayingAd = false;
    var ao2 = document.getElementById('adOverlay');
    if (ao2) ao2.classList.add('hidden');
    clearAdCountdown();

    currentIndex--;
    playVideo(queue[currentIndex]);
}

function playVideo(track) {
    if (!player || !playerReady) {
        setTimeout(function() { playVideo(track); }, 500);
        return;
    }
    try {
        player.unMute();
        player.setVolume(currentVolume);
        player.loadVideoById({ videoId: track.id, suggestedQuality: 'large' });

        updateNowPlaying(track.title, track.channel);
        songCount++;
        updateCounters();
        renderQueue();
        resetProgress();
        saveState();
    } catch(e) {
        console.error('playVideo error:', e);
        showToast('Erro ao carregar vídeo. Tentando novamente...');
        setTimeout(function() { playVideo(track); }, 1000);
    }
}

function playAd() {
    if (!player || !playerReady) return;
    isPlayingAd = true;

    var adOv = document.getElementById('adOverlay');
    if (adOv) adOv.classList.remove('hidden');

    try {
        player.unMute();
        player.setVolume(currentVolume);
        player.loadVideoById({ videoId: ADS_VIDEO_ID, suggestedQuality: 'large' });
    } catch(e) {}

    updateNowPlaying('📢 Publicidade Corporativa', 'RadioNetway.Tech');
    updateStatusUI('ad');
    broadcastState('ad');

    var seconds = 30;
    var cdEl = document.getElementById('adCountdown');
    if (cdEl) cdEl.textContent = seconds;
    adCountdownTimer = setInterval(function() {
        seconds--;
        var el = document.getElementById('adCountdown');
        if (el) el.textContent = Math.max(seconds, 0);
        if (seconds <= 0) clearAdCountdown();
    }, 1000);
}

function clearAdCountdown() {
    if (adCountdownTimer) {
        clearInterval(adCountdownTimer);
        adCountdownTimer = null;
    }
}

// ─────────────────────────────────────────────────────
// 8. PROGRESSO
// ─────────────────────────────────────────────────────
function startProgressTracking() {
    stopProgressTracking();
    progressTimer = setInterval(function() {
        updateProgress();
        broadcastState('playing');   // keep INDEX in sync with elapsed time
    }, 1000);
}

function stopProgressTracking() {
    if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
}

function updateProgress() {
    if (!player || !playerReady || typeof player.getCurrentTime !== 'function') return;
    try {
        var current  = player.getCurrentTime() || 0;
        var duration = player.getDuration()     || 0;
        if (duration > 0) {
            var pct = (current / duration) * 100;
            var pf = document.getElementById('progressFill');
            var pt = document.getElementById('progressThumb');
            var te = document.getElementById('timeElapsed');
            var td = document.getElementById('timeDuration');
            if (pf) pf.style.width = pct + '%';
            if (pt) pt.style.left  = pct + '%';
            if (te) te.textContent = formatTime(current);
            if (td) td.textContent = formatTime(duration);
        }
    } catch(e) {}
}

function resetProgress() {
    var pf = document.getElementById('progressFill');
    var pt = document.getElementById('progressThumb');
    var te = document.getElementById('timeElapsed');
    var td = document.getElementById('timeDuration');
    if (pf) pf.style.width = '0%';
    if (pt) pt.style.left  = '0%';
    if (te) te.textContent = '0:00';
    if (td) td.textContent = '--:--';
}

function formatTime(secs) {
    secs = Math.floor(secs);
    var m = Math.floor(secs / 60);
    var s = secs % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
}

// ─────────────────────────────────────────────────────
// 9. VOLUME
// ─────────────────────────────────────────────────────
function setVolume(val) {
    currentVolume = parseInt(val, 10);
    if (player && playerReady) {
        try { player.setVolume(currentVolume); } catch(e) {}
    }
    if (isMuted && currentVolume > 0) { isMuted = false; updateMuteIcon(); }
    saveState();
}

function toggleMute() {
    if (!player || !playerReady) return;
    isMuted = !isMuted;
    try {
        var vs = document.getElementById('volumeSlider');
        if (isMuted) {
            player.mute();
            if (vs) vs.value = 0;
        } else {
            player.unMute();
            player.setVolume(currentVolume);
            if (vs) vs.value = currentVolume;
        }
    } catch(e) {}
    updateMuteIcon();
}

function updateMuteIcon() {
    var icon = document.getElementById('muteIcon');
    if (!icon) return;
    icon.innerHTML = isMuted
        ? '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>'
        : '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
}

// ─────────────────────────────────────────────────────
// 10. ATUALIZAÇÃO DE UI
// ─────────────────────────────────────────────────────
function updateRadioUI(active) {
    var icon  = document.getElementById('btnIcon');
    var badge = document.getElementById('liveBadge');

    if (active) {
        updateStatusUI('live');
        if (icon) icon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        if (badge) badge.classList.add('on');
    } else {
        updateStatusUI('off');
        if (icon) icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
        if (badge) badge.classList.remove('on');
    }
}

function updateStatusUI(state) {
    var dot  = document.getElementById('statusDot');
    var txt  = document.getElementById('statusText');
    var pill = document.getElementById('statusPill');

    var map = {
        live: { cls: 'status-dot--live', label: 'No Ar',   pillCls: 'live' },
        ad:   { cls: 'status-dot--ad',   label: 'Anúncio', pillCls: 'ad'   },
        off:  { cls: 'status-dot--off',  label: 'Offline', pillCls: ''     }
    };
    var s = map[state] || map.off;
    if (dot)  dot.className   = 'status-dot ' + s.cls;
    if (txt)  txt.textContent = s.label;
    if (pill) pill.className  = 'status-pill' + (s.pillCls ? ' ' + s.pillCls : '');
}

function updateNowPlaying(title, channel) {
    var nt = document.getElementById('npTitle');
    var nc = document.getElementById('npChannel');
    if (nt) nt.textContent = title;
    if (nc) nc.textContent = channel;
}

function updateCounters() {
    var sc = document.getElementById('songCounter');
    var ai = document.getElementById('adIn');
    if (sc) sc.textContent = songCount + ' tocadas';
    var nextAd = AD_INTERVAL - (songCount % AD_INTERVAL);
    if (ai) ai.textContent = nextAd;
}

// ─────────────────────────────────────────────────────
// 11. TOAST
// ─────────────────────────────────────────────────────
var toastTimeout = null;

function showToast(msg) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    if (toastTimeout) clearTimeout(toastTimeout);
    toast.classList.remove('hidden', 'show');
    void toast.offsetWidth;
    toast.textContent = msg;
    toast.classList.add('show');
    toastTimeout = setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() { toast.classList.add('hidden'); }, 300);
    }, 3000);
}

// ─────────────────────────────────────────────────────
// 12. UTILITÁRIOS
// ─────────────────────────────────────────────────────
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ─────────────────────────────────────────────────────
// 13. DEMO PLAYLIST
// ─────────────────────────────────────────────────────
function loadDemoPlaylist() {
    var demos = [
        { id: 'jfKfPfyJRdk', title: 'Lofi Hip Hop Radio — Beats to Relax/Study', channel: 'Lofi Girl',       thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/mqdefault.jpg' },
        { id: '5qap5aO4i9A', title: 'Lofi Hip Hop Radio — Beats to Sleep/Chill', channel: 'Lofi Girl',       thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/mqdefault.jpg' },
        { id: 'DWcJFNfaw9c', title: 'Jazz & Bossa Nova — Café Music',            channel: 'Cafe Music BGM', thumbnail: 'https://i.ytimg.com/vi/DWcJFNfaw9c/mqdefault.jpg' }
    ];
    demos.forEach(function(d) { queue.push(d); });
    saveState();
    renderQueue();
    showToast('Demo carregada — 3 músicas adicionadas!');
}

// ─────────────────────────────────────────────────────
// 14. INICIALIZAÇÃO
// ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    loadState();
    renderQueue();
    updateCounters();

    var slider = document.getElementById('volumeSlider');
    if (slider) slider.value = currentVolume;

    if (queue.length > 0 && currentIndex >= 0 && currentIndex < queue.length) {
        updateNowPlaying(queue[currentIndex].title, queue[currentIndex].channel);
    }
});
// ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════
// SISTEMA DE ANÚNCIOS DE ÁUDIO — AudioAds v1.0
// ═══════════════════════════════════════════════════
// ─────────────────────────────────────────────────────

// ── Estado dos anúncios de áudio ──────────────────────
var adAudioList      = [];       // [{id, name, size, data}]
var adAudioEnabled   = false;
var adAudioInterval  = 180000;   // ms — default 3 min
var adAudioTimer     = null;     // setInterval handle
var adAudioCountdown = null;     // setInterval countdown
var adNextIn         = 0;        // segundos até próximo anúncio
var adCurrentAudio   = null;     // Audio() em uso
var adDuckVolume     = 30;       // volume abaixado durante anúncio
var devPanelOpen     = false;

// ── Persistência ──────────────────────────────────────
function saveAds() {
    try {
        var light = adAudioList.map(function(a) {
            return { id: a.id, name: a.name, size: a.size, data: a.data };
        });
        localStorage.setItem('rnw_audio_ads', JSON.stringify(light));
        localStorage.setItem('rnw_ads_enabled',  adAudioEnabled  ? '1' : '0');
        localStorage.setItem('rnw_ads_interval', adAudioInterval.toString());
    } catch(e) {
        console.warn('saveAds: localStorage cheio ou bloqueado.', e);
        showToast('Aviso: não foi possível salvar (storage cheio?)');
    }
}

function loadAds() {
    try {
        var raw = localStorage.getItem('rnw_audio_ads');
        if (raw) adAudioList = JSON.parse(raw);
        var en  = localStorage.getItem('rnw_ads_enabled');
        var iv  = localStorage.getItem('rnw_ads_interval');
        if (en !== null)  adAudioEnabled  = en === '1';
        if (iv !== null)  adAudioInterval = parseInt(iv, 10);
    } catch(e) { adAudioList = []; }
}

// ── Dev Panel toggle ──────────────────────────────────
function toggleDevPanel() {
    devPanelOpen = !devPanelOpen;
    var body    = document.getElementById('devPanelBody');
    var chevron = document.getElementById('devChevron');
    body.classList.toggle('open', devPanelOpen);
    chevron.classList.toggle('open', devPanelOpen);
}

// ── Upload de arquivo ─────────────────────────────────
function handleAdFileUpload(event) {
    var file = event.target.files[0];
    if (!file) return;

    if (!file.type.match(/audio\//)) {
        showToast('Apenas arquivos de áudio são aceitos.');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showToast('Arquivo muito grande (máx. 10MB).');
        return;
    }

    // Mostrar progresso
    var prog      = document.getElementById('uploadProgress');
    var progFill  = document.getElementById('uploadProgressFill');
    var progLabel = document.getElementById('uploadProgressLabel');
    prog.classList.remove('hidden');
    progFill.style.width = '0%';
    progLabel.textContent = 'Lendo arquivo...';

    var reader = new FileReader();
    reader.onprogress = function(e) {
        if (e.lengthComputable) {
            var pct = Math.round((e.loaded / e.total) * 85);
            progFill.style.width = pct + '%';
        }
    };
    reader.onload = function(e) {
        progFill.style.width = '95%';
        progLabel.textContent = 'Salvando...';

        var ad = {
            id:   'ad_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            name: file.name.replace(/\.[^.]+$/, ''),
            size: file.size,
            data: e.target.result   // base64 data URL
        };

        adAudioList.push(ad);
        saveAds();
        renderAdsList();
        showToast('"' + ad.name + '" adicionado!');

        progFill.style.width = '100%';
        progLabel.textContent = 'Salvo!';
        setTimeout(function() { prog.classList.add('hidden'); }, 1200);

        // Reset input
        event.target.value = '';
    };
    reader.onerror = function() {
        prog.classList.add('hidden');
        showToast('Erro ao ler o arquivo.');
    };
    reader.readAsDataURL(file);
}

// ── Drag-and-drop na upload zone ──────────────────────
(function initDragDrop() {
    document.addEventListener('DOMContentLoaded', function() {
        var zone = document.getElementById('uploadZone');
        if (!zone) return;
        zone.addEventListener('dragover', function(e) {
            e.preventDefault();
            zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', function() {
            zone.classList.remove('drag-over');
        });
        zone.addEventListener('drop', function(e) {
            e.preventDefault();
            zone.classList.remove('drag-over');
            var file = e.dataTransfer.files[0];
            if (!file) return;
            // Simular evento
            var fakeEvt = { target: { files: [file], value: '' }, preventDefault: function(){} };
            handleAdFileUpload(fakeEvt);
        });
    });
})();

// ── Renderizar lista de anúncios ──────────────────────
function renderAdsList() {
    var list  = document.getElementById('adsList');
    var empty = document.getElementById('adsEmpty');
    var count = document.getElementById('adsCount');
    if (!list) return;

    count.textContent = adAudioList.length + ' arquivo(s)';

    if (adAudioList.length === 0) {
        list.innerHTML = '';
        list.appendChild(empty || createAdsEmpty());
        if (empty) empty.style.display = '';
        return;
    }
    if (empty) empty.style.display = 'none';

    // Rebuild
    list.innerHTML = '';
    adAudioList.forEach(function(ad, idx) {
        var sizeMb = (ad.size / 1024 / 1024).toFixed(2);
        var div    = document.createElement('div');
        div.className = 'dev-ad-item';
        div.id = 'adItem_' + ad.id;
        div.style.animationDelay = (idx * 0.04) + 's';

        div.innerHTML =
            '<div class="dev-ad-item__icon">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>' +
            '</div>' +
            '<div class="dev-ad-item__info">' +
              '<div class="dev-ad-item__name">' + escapeHtml(ad.name) + '</div>' +
              '<div class="dev-ad-item__meta">' + sizeMb + ' MB · mp3</div>' +
            '</div>' +
            '<div class="dev-ad-item__actions">' +
              '<button class="dev-ad-btn" title="Pré-ouvir" data-id="' + escapeAttr(ad.id) + '" data-action="preview">' +
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
              '</button>' +
              '<button class="dev-ad-btn dev-ad-btn--del" title="Remover" data-id="' + escapeAttr(ad.id) + '" data-action="delete">' +
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>' +
              '</button>' +
            '</div>';

        div.querySelectorAll('[data-action]').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var id = btn.dataset.id;
                if (btn.dataset.action === 'preview') previewAd(id);
                else deleteAd(id);
            });
        });

        list.appendChild(div);
    });
}

function createAdsEmpty() {
    var d = document.createElement('div');
    d.id = 'adsEmpty';
    d.className = 'dev-ads-empty';
    d.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg><span>Nenhum anúncio salvo. Faça upload de um .mp3.</span>';
    return d;
}

// ── Preview (ouvir sem ducking) ───────────────────────
function previewAd(id) {
    var ad = adAudioList.find(function(a) { return a.id === id; });
    if (!ad) return;
    if (adCurrentAudio) { adCurrentAudio.pause(); adCurrentAudio = null; }
    var audio = new Audio(ad.data);
    audio.volume = 0.9;
    audio.play().then(function() {
        showToast('Ouvindo: ' + ad.name);
    }).catch(function(e) {
        showToast('Erro ao reproduzir: ' + e.message);
    });
    adCurrentAudio = audio;
}

// ── Remover anúncio ───────────────────────────────────
function deleteAd(id) {
    adAudioList = adAudioList.filter(function(a) { return a.id !== id; });
    saveAds();
    renderAdsList();
    showToast('Anúncio removido.');
}

// ── Toggle sistema de anúncios ────────────────────────
function toggleAdSystem() {
    adAudioEnabled = !adAudioEnabled;
    saveAds();
    updateAdSystemUI();
    if (adAudioEnabled) {
        scheduleNextAd();
        showToast('Anúncios de áudio ATIVADOS.');
    } else {
        clearAdSchedule();
        showToast('Anúncios de áudio DESATIVADOS.');
    }
}

function updateAdInterval() {
    var sel = document.getElementById('adIntervalSelect');
    if (sel) adAudioInterval = parseInt(sel.value, 10);
    saveAds();
    if (adAudioEnabled) {
        clearAdSchedule();
        scheduleNextAd();
    }
}

function updateAdSystemUI() {
    var btn   = document.getElementById('btnToggleAds');
    var dot   = document.getElementById('adStatusDot');
    var label = document.getElementById('adSystemLabel');
    if (!btn) return;

    if (adAudioEnabled) {
        btn.classList.add('active');
        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Desativar Anúncios';
        dot.classList.add('on');
        label.textContent = 'Anúncios ON';
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg> Ativar Anúncios';
        dot.classList.remove('on');
        label.textContent = 'Anúncios OFF';
    }

    // Sync select
    var sel = document.getElementById('adIntervalSelect');
    if (sel) sel.value = adAudioInterval.toString();
}

// ── Agendamento ───────────────────────────────────────
function scheduleNextAd() {
    clearAdSchedule();
    adNextIn = Math.floor(adAudioInterval / 1000);
    updateAdTimerUI();

    adAudioTimer = setInterval(function() {
        playVoiceAd();
        // Reagendar após tocar
    }, adAudioInterval);

    // Countdown a cada segundo
    adAudioCountdown = setInterval(function() {
        adNextIn--;
        if (adNextIn < 0) adNextIn = Math.floor(adAudioInterval / 1000);
        updateAdTimerUI();
    }, 1000);
}

function clearAdSchedule() {
    if (adAudioTimer)    { clearInterval(adAudioTimer);    adAudioTimer = null; }
    if (adAudioCountdown){ clearInterval(adAudioCountdown); adAudioCountdown = null; }
    var el = document.getElementById('nextAdTimer');
    if (el) el.textContent = '--:--';
}

function updateAdTimerUI() {
    var el = document.getElementById('nextAdTimer');
    if (!el) return;
    var m = Math.floor(adNextIn / 60);
    var s = adNextIn % 60;
    el.textContent = m + ':' + (s < 10 ? '0' : '') + s;
}

// ── Disparar anúncio agora (botão test ou interval) ───
function triggerAdNow() {
    if (adAudioList.length === 0) {
        showToast('Nenhum anúncio cadastrado. Faça upload de um .mp3.');
        return;
    }
    // Abrir painel se fechado
    if (!devPanelOpen) toggleDevPanel();
    playVoiceAd();
    // Reset countdown
    if (adAudioEnabled) {
        clearAdSchedule();
        scheduleNextAd();
    }
}

// ── DUCKING + reprodução ──────────────────────────────
// ── Fade de volume (admin-side) ─────────────────────
function adminFadeVolume(fromVol, toVol, durationMs, onDone) {
    if (!player || !playerReady) { if (onDone) onDone(); return; }
    var steps    = 30;
    var interval = durationMs / steps;
    var delta    = (toVol - fromVol) / steps;
    var current  = fromVol;
    var step     = 0;
    var timer = setInterval(function() {
        step++;
        current += delta;
        var vol = Math.round(Math.max(0, Math.min(100, current)));
        try { player.setVolume(vol); } catch(e) {}
        if (step >= steps) {
            clearInterval(timer);
            try { player.setVolume(toVol); } catch(e) {}
            if (onDone) onDone();
        }
    }, interval);
}

function playVoiceAd() {
    if (adAudioList.length === 0) return;

    if (adCurrentAudio) { adCurrentAudio.pause(); adCurrentAudio = null; }

    var idx = Math.floor(Math.random() * adAudioList.length);
    var ad  = adAudioList[idx];

    var volBefore = currentVolume;
    var duckVol   = Math.max(Math.round(volBefore * 0.30), 5);

    // Mostrar banner / overlay no admin
    var banner = document.getElementById('adPlayingBanner');
    var nameEl = document.getElementById('adPlayingName');
    var volEl  = document.getElementById('adDuckVolLabel');
    if (banner) banner.classList.remove('hidden');
    if (nameEl) nameEl.textContent = ad.name;
    if (volEl)  volEl.textContent  = duckVol + '%';
    var item = document.getElementById('adItem_' + ad.id);
    if (item) item.classList.add('playing');
    var overlay = document.getElementById('adOverlay');
    if (overlay) overlay.classList.remove('hidden');
    updateStatusUI('ad');

    // Broadcast para o INDEX tocar o anuncio com fade
    broadcastState('ad', { adData: ad.data, adName: ad.name });

    // Admin: fade down → aguarda fim do anuncio estimado pelo audio
    var audio = new Audio(ad.data);
    adCurrentAudio = audio;

    adminFadeVolume(volBefore, duckVol, 1200, function() {
        audio.play().catch(function() {});
    });

    audio.onended = function() { restoreAfterAd(volBefore, duckVol, ad); };
    audio.onerror = function() { restoreAfterAd(volBefore, duckVol, ad); };
}

function restoreAfterAd(originalVol, duckVol, ad) {
    adCurrentAudio = null;

    var banner = document.getElementById('adPlayingBanner');
    if (banner) banner.classList.add('hidden');
    var overlay = document.getElementById('adOverlay');
    if (overlay) overlay.classList.add('hidden');
    if (ad) {
        var item = document.getElementById('adItem_' + ad.id);
        if (item) item.classList.remove('playing');
    }
    if (radioActive) updateStatusUI('live');
    else updateStatusUI('off');

    // Broadcast: anuncio terminou — index deve restaurar volume
    broadcastState(radioActive ? 'playing' : 'stopped', { adEnded: true });

    // Admin: fade up
    adminFadeVolume(duckVol, originalVol, 2500, null);
}

// ── Inicialização dos ads ─────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    loadAds();
    updateAdSystemUI();
    renderAdsList();

    if (adAudioEnabled) scheduleNextAd();

    // Sync interval select
    var sel = document.getElementById('adIntervalSelect');
    if (sel) sel.value = adAudioInterval.toString();
});