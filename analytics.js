/*
 * Analítica agregada para Espejos Digitales.
 * La gráfica representa únicamente visualizaciones por apartado.
 * Con servidor Node/API disponible, los cambios llegan por SSE en tiempo real.
 * En GitHub Pages se conserva un respaldo local del navegador.
 */
(() => {
    'use strict';

    const sectionIds = ['inicio', 'historia', 'relatos', 'podcast', 'recursos'];
    const labels = {
        inicio: 'Inicio',
        historia: 'Historia',
        relatos: 'Relatos',
        podcast: 'Podcast',
        recursos: 'Autodiagnóstico y Kit de Vida Digital Sana'
    };
    const sliceColors = ['#67e8f9', '#f9a8d4', '#a78bfa', '#fbbf24', '#34d399'];
    const sessionId = getSessionId();
    const seenKey = 'ed-analytics-seen';
    const localKey = 'ed-analytics-local-v2';
    const seen = new Set(readSessionArray(seenKey));
    const canvas = document.getElementById('visitor-analytics-chart');
    const legendContainer = document.getElementById('visitor-analytics-legend');
    const status = document.getElementById('analytics-status');
    const reactionStatus = document.getElementById('reaction-status');
    const reactionButtons = [...document.querySelectorAll('[data-reaction]')];
    let chart = null;
    let currentSection = null;
    let serverAvailable = false;
    let eventStream = null;

    if (!canvas) return;

    function getSessionId() {
        try {
            let id = sessionStorage.getItem('ed-analytics-session');
            if (!id) {
                id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                sessionStorage.setItem('ed-analytics-session', id);
            }
            return id;
        } catch (_) {
            return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }
    }

    function readSessionArray(key) {
        try {
            const value = JSON.parse(sessionStorage.getItem(key) || '[]');
            return Array.isArray(value) ? value : [];
        } catch (_) { return []; }
    }

    function saveSessionValue(key, value) {
        try { sessionStorage.setItem(key, value); } catch (_) { /* almacenamiento opcional */ }
    }

    function emptySections() {
        return Object.fromEntries(sectionIds.map(id => [id, { views: 0 }]));
    }

    function readLocalData() {
        try {
            const parsed = JSON.parse(localStorage.getItem(localKey) || 'null');
            if (parsed && parsed.sections) {
                for (const id of sectionIds) parsed.sections[id] ||= { views: 0 };
                return parsed;
            }
        } catch (_) { /* crear almacenamiento inicial */ }
        return { visits: 0, likes: 0, dislikes: 0, sections: emptySections() };
    }

    function saveLocalData(data) {
        try { localStorage.setItem(localKey, JSON.stringify(data)); } catch (_) { /* almacenamiento opcional */ }
    }

    function addLocalMetric(path, body) {
        const data = readLocalData();
        if (path === '/api/visit') {
            let counted = false;
            try { counted = sessionStorage.getItem('ed-analytics-local-visit') === '1'; } catch (_) { /* continúa */ }
            if (!counted) {
                data.visits += 1;
                saveSessionValue('ed-analytics-local-visit', '1');
            }
        } else if (path === '/api/section-view' && sectionIds.includes(body.section)) {
            data.sections[body.section].views += 1;
        } else if (path === '/api/reaction' && ['like', 'dislike'].includes(body.reaction)) {
            const key = body.reaction === 'like' ? 'likes' : 'dislikes';
            data[key] += 1;
        }
        saveLocalData(data);
        return localMetrics();
    }

    function localMetrics() {
        const data = readLocalData();
        return {
            updatedAt: new Date().toISOString(),
            visits: data.visits,
            todayVisits: data.visits,
            likes: data.likes,
            dislikes: data.dislikes,
            sections: data.sections
        };
    }

    async function postMetric(path, body) {
        try {
            const response = await fetch(path, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                keepalive: true,
                cache: 'no-store'
            });
            if (response.ok) {
                serverAvailable = true;
                return { ok: true, local: false };
            }
        } catch (_) { /* GitHub Pages y otros hosts estáticos no exponen /api */ }
        serverAvailable = false;
        return { ok: true, local: true, data: addLocalMetric(path, body) };
    }

    function setStatus(message, isError = false) {
        if (!status) return;
        status.textContent = message;
        status.classList.toggle('is-error', isError);
    }

    function sectionLabel(id) { return labels[id] || id; }

    const centerLabelsPlugin = {
        id: 'analyticsDonutLabels',
        afterDatasetsDraw(instance) {
            const values = instance.data.datasets[0]?.data || [];
            const visibleValues = values.map((value, index) => instance.getDataVisibility(index) ? (Number(value) || 0) : 0);
            const visibleTotal = visibleValues.reduce((sum, value) => sum + value, 0);
            const ctx = instance.ctx;
            const area = instance.chartArea;
            if (!area) return;
            const centerX = (area.left + area.right) / 2;
            const centerY = (area.top + area.bottom) / 2;

            instance.getDatasetMeta(0).data.forEach((arc, index) => {
                const value = visibleValues[index];
                if (!value || !visibleTotal) return;
                const share = value / visibleTotal * 100;
                if (share < 7) return;
                const point = arc.getCenterPoint();
                ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = '#1e1038'; ctx.font = '700 12px Arial, sans-serif';
                ctx.fillText(`${Math.round(share)}%`, point.x, point.y); ctx.restore();
            });

            ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff'; ctx.font = '700 19px Arial, sans-serif';
            ctx.fillText(Math.round(visibleTotal).toLocaleString('es-CO'), centerX, centerY - 7);
            ctx.fillStyle = '#c4b5fd'; ctx.font = '700 9px Arial, sans-serif';
            ctx.fillText('VISTAS EN APARTADOS', centerX, centerY + 13); ctx.restore();
        }
    };

    function makeChartData(data = {}) {
        const sectionData = sectionIds.map(id => data.sections?.[id] || { views: 0 });
        const views = sectionData.map(item => Math.max(0, Number(item.views) || 0));
        // Mantiene el anillo visible mientras todavía no hay datos, sin alterar los conteos.
        const chartValues = views.some(value => value > 0) ? views : sectionIds.map(() => 1);
        return {
            labels: sectionIds.map(sectionLabel),
            datasets: [{
                data: chartValues,
                backgroundColor: sliceColors,
                borderColor: '#32105b', borderWidth: 3,
                hoverBorderColor: '#fff', hoverBorderWidth: 2, hoverOffset: 9, spacing: 2
            }]
        };
    }

    function makeChartOptions() {
        return {
            font: { family: 'Arial, sans-serif', weight: '600' },
            responsive: true, maintainAspectRatio: false, cutout: '58%', radius: '92%',
            animation: false,
            transitions: { active: { animation: { duration: 0 } }, resize: { animation: { duration: 0 } }, show: { animations: { colors: { duration: 0 }, visible: { duration: 0 } } }, hide: { animations: { colors: { duration: 0 }, visible: { duration: 0 } } } },
            interaction: { mode: 'nearest', intersect: true }, layout: { padding: 8 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true, backgroundColor: 'rgba(30, 10, 57, .97)', titleColor: '#fff', bodyColor: '#f8fafc',
                    borderColor: 'rgba(196, 181, 253, .4)', borderWidth: 1, padding: 12,
                    titleFont: { family: 'Arial, sans-serif', weight: '700', size: 13 },
                    bodyFont: { family: 'Arial, sans-serif', weight: '600', size: 12 },
                    callbacks: {
                        title(items) { return items[0]?.label || ''; },
                        label(context) {
                            const id = sectionIds[context.dataIndex];
                            const section = context.chart.$analyticsSections?.[id] || {};
                            const views = Math.max(0, Number(section.views) || 0);
                            const total = sectionIds.reduce((sum, key) => sum + Math.max(0, Number(context.chart.$analyticsSections?.[key]?.views) || 0), 0);
                            return ` ${views.toLocaleString('es-CO')} ${views === 1 ? 'vista' : 'vistas'} (${(total ? views / total * 100 : 0).toFixed(1)}%)`;
                        }
                    }
                }
            }
        };
    }

    function initializeChart() {
        if (typeof Chart === 'undefined') {
            setStatus('No se pudo cargar el gráfico. Comprueba que vendor/chart.min.js esté incluido.', true);
            return;
        }
        chart = new Chart(canvas, { type: 'doughnut', data: makeChartData(), options: makeChartOptions(), plugins: [centerLabelsPlugin] });
        renderChartLegend(localMetrics());
    }

    function renderChartLegend(data = {}) {
        if (!legendContainer) return;
        const items = sectionIds.map(id => ({
            id,
            label: sectionLabel(id),
            views: Math.max(0, Number(data.sections?.[id]?.views) || 0)
        }));
        const visibleTotal = items.reduce((sum, item, index) => sum + ((chart?.getDataVisibility(index) ?? true) ? item.views : 0), 0);
        legendContainer.replaceChildren();
        items.forEach((item, index) => {
            const isVisible = chart?.getDataVisibility(index) ?? true;
            const share = isVisible && visibleTotal ? item.views / visibleTotal * 100 : 0;
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'analytics-chart-legend-item';
            button.setAttribute('aria-pressed', String(isVisible));
            button.setAttribute('aria-label', `${item.label}: ${item.views} ${item.views === 1 ? 'vista' : 'vistas'}, ${share.toFixed(1)} por ciento. Tocar para mostrar u ocultar.`);
            const swatch = document.createElement('span'); swatch.className = 'analytics-chart-legend-swatch';
            swatch.style.backgroundColor = sliceColors[index]; swatch.setAttribute('aria-hidden', 'true');
            const name = document.createElement('span'); name.className = 'analytics-chart-legend-name'; name.textContent = item.label;
            const metrics = document.createElement('span'); metrics.className = 'analytics-chart-legend-metrics';
            const percentage = document.createElement('strong'); percentage.className = 'analytics-chart-legend-percent'; percentage.textContent = `${share.toFixed(1)}%`;
            const count = document.createElement('small'); count.textContent = `${item.views.toLocaleString('es-CO')} ${item.views === 1 ? 'vista' : 'vistas'}`;
            metrics.append(percentage, count); button.append(swatch, name, metrics);
            button.addEventListener('click', () => {
                if (!chart) return;
                chart.toggleDataVisibility(index); chart.update('none'); renderChartLegend(data);
            });
            legendContainer.append(button);
        });
    }

    function updateChart(data) {
        if (!chart) return;
        chart.$analyticsSections = data.sections || {};
        const nextData = makeChartData(data).datasets[0].data;
        chart.data.datasets[0].data = nextData;
        chart.update('none');
        renderChartLegend(data);
    }

    function updateSummary(data) {
        const totalVisits = document.getElementById('analytics-total-visits');
        const totalLikes = document.getElementById('analytics-total-likes');
        const totalDislikes = document.getElementById('analytics-total-dislikes');
        if (totalVisits) totalVisits.textContent = Number(data.todayVisits ?? data.visits ?? 0).toLocaleString('es-CO');
        if (totalLikes) totalLikes.textContent = Number(data.likes || 0).toLocaleString('es-CO');
        if (totalDislikes) totalDislikes.textContent = Number(data.dislikes || 0).toLocaleString('es-CO');
    }

    function applyMetrics(data, source = 'Servidor activo') {
        if (!data || !data.sections) return;
        updateSummary(data);
        updateChart(data);
        if (source) setStatus(`${source} · Gráfica actualizada al registrar una nueva visita.`);
    }

    async function loadMetrics() {
        try {
            const response = await fetch('/api/analytics', { cache: 'no-store' });
            if (!response.ok) throw new Error('API no disponible');
            const data = await response.json();
            serverAvailable = true;
            applyMetrics(data, 'Servidor activo');
        } catch (_) {
            serverAvailable = false;
            applyMetrics(localMetrics(), 'Modo local');
            setStatus('Modo GitHub/estático: las visualizaciones se guardan solo en este navegador.');
        }
    }

    function connectLiveUpdates() {
        if (!window.EventSource) return;
        eventStream = new EventSource('/api/analytics/stream');
        eventStream.onopen = () => { serverAvailable = true; };
        eventStream.onmessage = event => {
            try { applyMetrics(JSON.parse(event.data), 'Actualización en vivo'); } catch (_) { /* ignora eventos inválidos */ }
        };
        eventStream.onerror = () => {
            eventStream?.close();
            eventStream = null;
            serverAvailable = false;
            // No se inicia ningún intervalo: el siguiente evento de navegación vuelve a intentar cargar datos.
        };
    }

    function reportSectionView(id) {
        if (seen.has(id)) return;
        seen.add(id); saveSessionValue(seenKey, JSON.stringify([...seen]));
        postMetric('/api/section-view', { sessionId, section: id }).then(result => {
            if (result.local && result.data) applyMetrics(result.data, 'Modo local');
        });
    }

    function setCurrentSection(id) {
        if (currentSection === id) return;
        currentSection = id;
        reportSectionView(id);
    }

    async function startTracking() {
        initializeChart();
        if ('IntersectionObserver' in window) {
            const ratios = new Map();
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0));
                let bestId = null;
                let bestRatio = 0.22;
                for (const id of sectionIds) {
                    const ratio = ratios.get(id) || 0;
                    if (ratio > bestRatio) { bestRatio = ratio; bestId = id; }
                }
                if (bestId) setCurrentSection(bestId);
            }, { threshold: [0, 0.22, 0.4, 0.65, 0.85] });
            sectionIds.forEach(id => { const section = document.getElementById(id); if (section) { ratios.set(id, 0); observer.observe(section); } });
        } else if (document.getElementById('inicio')) setCurrentSection('inicio');

        await postMetric('/api/visit', { sessionId });
        await loadMetrics();
        connectLiveUpdates();
    }

    function initReactionButtons() {
        let savedReaction = null;
        try { savedReaction = sessionStorage.getItem('ed-analytics-reaction'); } catch (_) { /* opcional */ }
        if (savedReaction) setReaction(savedReaction, 'Gracias por compartir tu opinión. Tu reacción ya quedó registrada en esta visita.');

        reactionButtons.forEach(button => button.addEventListener('click', async () => {
            let alreadyVoted = false;
            try { alreadyVoted = Boolean(sessionStorage.getItem('ed-analytics-reaction')); } catch (_) { /* continúa */ }
            if (alreadyVoted) return;
            const choice = button.dataset.reaction;
            reactionButtons.forEach(item => { item.disabled = true; });
            const result = await postMetric('/api/reaction', { sessionId, reaction: choice });
            saveSessionValue('ed-analytics-reaction', choice);
            setReaction(choice, result.local
                ? '¡Gracias! Tu reacción quedó guardada en este navegador.'
                : '¡Gracias! Tu reacción quedó registrada de forma anónima.');
            if (result.local && result.data) applyMetrics(result.data, 'Modo local');
        }));
    }

    function setReaction(choice, message) {
        reactionButtons.forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.reaction === choice));
            button.disabled = true;
        });
        if (reactionStatus) reactionStatus.textContent = message;
    }

    initReactionButtons();
    startTracking();
})();
