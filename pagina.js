/* Interacciones accesibles — Espejos Digitales */
(() => {
    'use strict';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const radarIsMobile = window.matchMedia('(max-width: 639px)').matches;
    const radarLabelFontSize = radarIsMobile ? Math.max(7.5, Math.min(8, window.innerWidth / 40)) : 12;
    const radarEdgePadding = radarIsMobile ? (window.innerWidth <= 360 ? 72 : 60) : 34;
    const quizDimensions = {
        tiempo: ['q6'],
        impulso: ['q3', 'q7'],
        ansiedad: ['q8'],
        comparacion: ['q1', 'q5'],
        validacion: ['q2'],
        autoimagen: ['q4']
    };
    const skillLabels = [
        'Gestión del tiempo',
        'Pausa consciente',
        'Calma emocional',
        'Mirada propia',
        'Autonomía digital',
        'Autoimagen positiva'
    ];
    const radarLabelLines = {
        'Gestión del tiempo': ['Gestión del', 'tiempo'],
        'Pausa consciente': ['Pausa', 'consciente'],
        'Calma emocional': ['Calma', 'emocional'],
        'Mirada propia': ['Mirada', 'propia'],
        'Autonomía digital': ['Autonomía', 'digital'],
        'Autoimagen positiva': ['Autoimagen', 'positiva']
    };
    const dimensionOrder = ['tiempo', 'impulso', 'ansiedad', 'comparacion', 'validacion', 'autoimagen'];
    let radarChart = null;

    document.documentElement.classList.add('has-motion-js');
    document.addEventListener('DOMContentLoaded', () => {
        initMobileMenu();
        initDisclosurePanels();
        initQuiz();
        initQuizDisclosure();
        initPodcast();
        initStoryModal();
        initInteractiveEffects();
        initNavigationState();
        initRevealMotion();
    });

    function initMobileMenu() {
        const button = document.getElementById('mobile-menu-btn');
        const menu = document.getElementById('mobile-menu');
        const icon = button?.querySelector('i');
        if (!button || !menu) return;

        const setOpen = (open) => {
            menu.classList.toggle('is-open', open);
            button.setAttribute('aria-expanded', String(open));
            button.setAttribute('aria-label', open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
            menu.setAttribute('aria-hidden', String(!open));
            if (icon) icon.className = open ? 'fa-solid fa-xmark text-xl' : 'fa-solid fa-bars text-xl';
        };

        button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
        menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
                setOpen(false);
                button.focus();
            }
        });
        document.addEventListener('click', (event) => {
            if (button.getAttribute('aria-expanded') === 'true' && !menu.contains(event.target) && !button.contains(event.target)) {
                setOpen(false);
            }
        });
        const desktopQuery = window.matchMedia('(min-width: 1024px)');
        desktopQuery.addEventListener?.('change', (event) => {
            if (event.matches) setOpen(false);
        });
        setOpen(false);
    }

    function initDisclosurePanels() {
        const buttons = Array.from(document.querySelectorAll('[data-panel-toggle]'));
        if (!buttons.length) return;

        const setPanel = (button, open) => {
            const panel = document.getElementById(button.getAttribute('aria-controls'));
            if (!panel) return;
            panel.classList.toggle('is-open', open);
            panel.setAttribute('aria-hidden', String(!open));
            panel.toggleAttribute('inert', !open);
            button.setAttribute('aria-expanded', String(open));
            button.classList.toggle('is-active', open);
        };

        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                const panel = document.getElementById(button.getAttribute('aria-controls'));
                const shouldOpen = !panel?.classList.contains('is-open');
                buttons.forEach((other) => setPanel(other, false));
                setPanel(button, shouldOpen);
                if (shouldOpen && panel) {
                    window.setTimeout(() => panel.scrollIntoView({
                        behavior: reduceMotion ? 'auto' : 'smooth',
                        block: 'nearest'
                    }), 80);
                }
            });
            const panel = document.getElementById(button.getAttribute('aria-controls'));
            if (panel) {
                const openByDefault = button.getAttribute('data-panel-toggle') === 'stories';
                panel.classList.toggle('is-open', openByDefault);
                panel.setAttribute('aria-hidden', String(!openByDefault));
                panel.toggleAttribute('inert', !openByDefault);
                button.setAttribute('aria-expanded', String(openByDefault));
                button.classList.toggle('is-active', openByDefault);
            }
        });
    }

    function initQuiz() {
        const form = document.getElementById('quiz-form');
        const result = document.getElementById('quiz-result');
        if (!form || !result) return;

        form.addEventListener('submit', calculateQuizResult);
        form.addEventListener('change', (event) => {
            const selected = event.target;
            if (!selected.matches('input[type="radio"]')) return;
            const group = selected.closest('fieldset');
            group?.querySelectorAll('.quiz-options > label').forEach((label) => {
                label.classList.toggle('is-selected', label.contains(selected) && selected.checked);
            });
            if (!result.classList.contains('hidden')) {
                updateQuizResult(false);
            }
        });
    }

    function initQuizDisclosure() {
        const toggle = document.getElementById('quiz-toggle');
        const content = document.getElementById('quiz-content');
        if (!toggle || !content) return;
        const setOpen = (open) => {
            content.classList.toggle('is-open', open);
            content.setAttribute('aria-hidden', String(!open));
            toggle.setAttribute('aria-expanded', String(open));
        };
        toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
        setOpen(true);
    }

    function readRiskScores() {
        const form = document.getElementById('quiz-form');
        const scores = {};
        Object.entries(quizDimensions).forEach(([dimension, questions]) => {
            const values = questions
                .map((name) => form.querySelector(`input[name="${name}"]:checked`))
                .filter(Boolean)
                .map((input) => Number(input.value))
                .filter(Number.isFinite);
            const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 1;
            scores[dimension] = Math.round(((average - 1) / 2) * 100);
        });
        return scores;
    }

    function calculateQuizResult(event) {
        event.preventDefault();
        const form = document.getElementById('quiz-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        updateQuizResult(true);
    }

    function updateQuizResult(shouldScroll) {
        const risks = readRiskScores();
        const skills = dimensionOrder.map((dimension) => 100 - risks[dimension]);
        const averageRisk = Math.round(Object.values(risks).reduce((sum, value) => sum + value, 0) / dimensionOrder.length);
        const result = document.getElementById('quiz-result');
        const title = document.getElementById('result-title');
        const description = document.getElementById('result-desc');

        if (averageRisk < 34) {
            title.textContent = '¡Buen balance digital!';
            description.textContent = `Tu nivel de señales que conviene observar es ${averageRisk}%. El mapa muestra fortalezas para sostener y áreas donde puedes seguir cuidándote. No es un diagnóstico clínico: es una guía de reflexión personal.`;
        } else if (averageRisk < 67) {
            title.textContent = 'Hay hábitos que puedes ajustar';
            description.textContent = `Tus respuestas marcan ${averageRisk}% de señales para observar. El gráfico transforma tus respuestas en habilidades de bienestar: cuanto más alto cada eje, más sólido es ese hábito.`;
        } else {
            title.textContent = 'Tu bienestar merece más espacio';
            description.textContent = `Tus respuestas marcan ${averageRisk}% de señales para observar. Empieza con un cambio pequeño: el gráfico indica qué habilidades puedes fortalecer. No es un diagnóstico clínico, sino una invitación a reflexionar.`;
        }

        dimensionOrder.forEach((dimension, index) => updateSkillBar(dimension, skills[index]));
        renderRadarChart(skills);
        result.classList.remove('hidden');
        result.classList.remove('is-visible', 'result-replay');
        void result.offsetWidth;
        result.classList.add('is-visible', 'result-replay');
        window.setTimeout(() => result.classList.remove('result-replay'), 900);
        const submitButton = document.getElementById('quiz-submit');
        if (submitButton) {
            submitButton.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Actualizar mi gráfico y resultados';
        }
        if (shouldScroll) {
            requestAnimationFrame(() => result.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }));
        }
    }

    function updateSkillBar(dimension, value) {
        const label = document.getElementById(`bar-val-${dimension}`);
        const fill = document.getElementById(`bar-fill-${dimension}`);
        if (label) label.textContent = `${value}%`;
        if (fill) fill.style.width = `${value}%`;
    }

    function renderRadarChart(values) {
        const canvas = document.getElementById('dimensionsRadarChart');
        if (!canvas || typeof Chart === 'undefined') return;
        if (radarChart) radarChart.destroy();

        radarChart = new Chart(canvas, {
            type: 'radar',
            data: {
                labels: skillLabels,
                datasets: [{
                    label: 'Habilidades de bienestar digital',
                    data: values,
                    backgroundColor: 'rgba(99, 102, 241, 0.26)',
                    borderColor: 'rgba(129, 140, 248, 0.95)',
                    pointBackgroundColor: 'rgba(34, 211, 238, 1)',
                    pointBorderColor: '#ffffff',
                    pointHoverBackgroundColor: '#ffffff',
                    pointHoverBorderColor: 'rgba(34, 211, 238, 1)',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2.5,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: reduceMotion ? 0 : 1100, easing: 'easeOutQuart' },
                layout: {
                    padding: { top: 24, right: radarEdgePadding, bottom: 24, left: radarEdgePadding }
                },
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        beginAtZero: true,
                        ticks: { stepSize: 20, display: false, backdropColor: 'transparent' },
                        angleLines: { color: 'rgba(148, 163, 184, 0.24)' },
                        grid: { color: 'rgba(148, 163, 184, 0.24)' },
                        pointLabels: {
                            color: '#e2e8f0',
                            padding: radarIsMobile ? 0 : 10,
                            font: (context) => {
                                const isEdgeLabel = context.index === 1 || context.index === 5;
                                return {
                                    size: isEdgeLabel ? (radarIsMobile ? 6.5 : 10) : radarLabelFontSize,
                                    weight: '600',
                                    family: 'Arial, sans-serif'
                                };
                            },
                            callback: (label, index) => {
                                const lines = radarLabelLines[label] || [label];
                                if (index === 1) return lines.map((line) => `${line} `);
                                if (index === 5) return lines.map((line) => ` ${line}`);
                                return lines;
                            }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (context) => ` Habilidad: ${context.formattedValue}%` } }
                }
            }
        });
    }

    function initPodcast() {
        const audio = document.getElementById('podcast-audio');
        const progress = document.getElementById('progress-container');
        const section = document.getElementById('podcast');
        if (!audio || !section) return;

        audio.addEventListener('play', () => section.classList.add('is-playing'));
        audio.addEventListener('pause', () => section.classList.remove('is-playing'));
        audio.addEventListener('ended', () => section.classList.remove('is-playing'));
        audio.addEventListener('timeupdate', () => {
            if (progress && Number.isFinite(audio.duration) && audio.duration > 0) {
                const percentage = Math.round((audio.currentTime / audio.duration) * 100);
                progress.setAttribute('aria-valuenow', String(percentage));
            }
        });
        document.querySelectorAll('.episode-card').forEach((card, index) => {
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `Seleccionar episodio: ${card.querySelector('h5')?.textContent.trim() || 'del podcast'}`);
            card.dataset.episodeIndex = String(index);
            card.setAttribute('aria-pressed', String(card.classList.contains('is-current')));
            card.addEventListener('keydown', (event) => {
                if (event.target !== card) return;
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    card.click();
                }
            });
        });
        if (progress) {
            progress.addEventListener('keydown', (event) => {
                if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
                const steps = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5, PageDown: -15, PageUp: 15 };
                if (Object.hasOwn(steps, event.key)) {
                    event.preventDefault();
                    audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + steps[event.key]));
                } else if (event.key === 'Home') {
                    event.preventDefault();
                    audio.currentTime = 0;
                } else if (event.key === 'End') {
                    event.preventDefault();
                    audio.currentTime = audio.duration;
                }
            });
        }
    }

    function initStoryModal() {
        const modal = document.getElementById('story-modal');
        if (!modal) return;
        modal.addEventListener('click', (event) => {
            if (event.target === modal && typeof window.closeStoryModal === 'function') window.closeStoryModal();
        });
        document.addEventListener('keydown', (event) => {
            if (modal.classList.contains('hidden')) return;
            if (event.key === 'Escape' && typeof window.closeStoryModal === 'function') {
                window.closeStoryModal();
                return;
            }
            if (event.key !== 'Tab') return;
            const focusable = Array.from(modal.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), video[controls], iframe:not(.hidden), [tabindex]:not([tabindex="-1"])'))
                .filter((element) => element.getClientRects().length > 0);
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            } else if (!modal.contains(document.activeElement)) {
                event.preventDefault();
                first.focus();
            }
        });
        document.querySelectorAll('#stories-grid button[onclick*="openStoryModal"], #interviews-grid button[onclick*="openStoryModal"]').forEach((button) => {
            button.addEventListener('click', () => {
                window.setTimeout(() => document.querySelector('#story-modal button[aria-label="Cerrar modal"]')?.focus(), 0);
            });
        });
    }

    function initNavigationState() {
        const header = document.getElementById('main-header');
        const links = Array.from(document.querySelectorAll('.nav-link'));
        if (!header) return;
        const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
        updateHeader();
        window.addEventListener('scroll', updateHeader, { passive: true });

        if (!('IntersectionObserver' in window) || !links.length) return;
        const linkById = new Map(links.map((link) => [link.getAttribute('href')?.slice(1), link]));
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                links.forEach((link) => link.removeAttribute('aria-current'));
                linkById.get(entry.target.id)?.setAttribute('aria-current', 'location');
            });
        }, { rootMargin: '-28% 0px -62% 0px', threshold: 0 });
        document.querySelectorAll('main section[id]').forEach((section) => observer.observe(section));
    }

    function initInteractiveEffects() {
        initHeroParallax();
        initCardParallax();
        initCursorGlow();
        initTouchFeedback();
    }

    function initCardParallax() {
        if (reduceMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        document.querySelectorAll('.story-card, .kit-card, .action-item').forEach((card) => {
            card.addEventListener('pointermove', (event) => {
                const rect = card.getBoundingClientRect();
                const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
                const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
                card.style.setProperty('--card-tilt-x', `${(x * 2.2).toFixed(2)}deg`);
                card.style.setProperty('--card-tilt-y', `${(-y * 2.2).toFixed(2)}deg`);
                card.style.setProperty('--card-glow-x', `${((x + 1) * 50).toFixed(1)}%`);
                card.style.setProperty('--card-glow-y', `${((y + 1) * 50).toFixed(1)}%`);
            }, { passive: true });
            card.addEventListener('pointerleave', () => {
                card.style.setProperty('--card-tilt-x', '0deg');
                card.style.setProperty('--card-tilt-y', '0deg');
                card.style.setProperty('--card-glow-x', '50%');
                card.style.setProperty('--card-glow-y', '50%');
            });
        });
    }

    function initHeroParallax() {
        const hero = document.getElementById('inicio');
        const layers = Array.from(hero?.querySelectorAll('[data-parallax-depth]') || []);
        if (!hero || !layers.length) return;

        const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        let pointerX = 0;
        let pointerY = 0;
        let frame = 0;

        const update = () => {
            frame = 0;
            const rect = hero.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight) return;
            layers.forEach((layer) => {
                const depth = Number(layer.dataset.parallaxDepth) || 0;
                const x = finePointer ? pointerX * depth * 70 : 0;
                const pointerOffsetY = finePointer ? pointerY * depth * 48 : 0;
                const scrollOffsetY = Math.max(-24, Math.min(24, -window.scrollY * depth * 0.07));
                layer.style.transform = `translate3d(${x.toFixed(1)}px, ${(pointerOffsetY + scrollOffsetY).toFixed(1)}px, 0)`;
            });
        };
        const schedule = () => {
            if (!frame) frame = window.requestAnimationFrame(update);
        };

        if (finePointer) {
            window.addEventListener('pointermove', (event) => {
                const rect = hero.getBoundingClientRect();
                pointerX = ((event.clientX - rect.left) / rect.width) - 0.5;
                pointerY = ((event.clientY - rect.top) / rect.height) - 0.5;
                schedule();
            }, { passive: true });
        }
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule, { passive: true });
        schedule();
    }

    function initCursorGlow() {
        if (reduceMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        const glow = document.createElement('div');
        glow.className = 'cursor-glow';
        glow.setAttribute('aria-hidden', 'true');
        document.body.appendChild(glow);
        let frame = 0;
        let x = 0;
        let y = 0;
        const paint = () => {
            frame = 0;
            glow.style.transform = `translate3d(${x - 180}px, ${y - 180}px, 0)`;
            glow.classList.add('is-visible');
        };
        document.addEventListener('pointermove', (event) => {
            if (event.pointerType === 'touch') return;
            x = event.clientX;
            y = event.clientY;
            if (!frame) frame = window.requestAnimationFrame(paint);
        }, { passive: true });
        document.addEventListener('pointerleave', () => glow.classList.remove('is-visible'));
    }

    function initTouchFeedback() {
        document.addEventListener('pointerdown', (event) => {
            if (event.pointerType !== 'touch' || !(event.target instanceof Element)) return;
            const target = event.target.closest('button, .episode-card, .story-card, .story-filter-button, .quiz-options > label, summary, a[href^="#"]');
            if (!target) return;
            target.classList.remove('touch-feedback');
            void target.offsetWidth;
            target.classList.add('touch-feedback');
            window.setTimeout(() => target.classList.remove('touch-feedback'), 440);
        }, { passive: true });
    }

    function initRevealMotion() {
        const targets = document.querySelectorAll('.section-heading, .story-card, .episode-card, .resources-layout > *, .footer-contenedor');
        targets.forEach((element, index) => {
            element.dataset.reveal = '';
            element.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * 55}ms`);
        });
        if (reduceMotion || !('IntersectionObserver' in window)) {
            targets.forEach((element) => element.classList.add('is-revealed'));
            return;
        }
        const observer = new IntersectionObserver((entries, instance) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-revealed');
                    instance.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
        targets.forEach((element) => observer.observe(element));
    }
})();
