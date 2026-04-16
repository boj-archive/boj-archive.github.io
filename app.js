(function () {
    "use strict";

    const PROBLEMS_BASE = "/archive/problems";
    let originalContent = null;

    const TAG_I18N = {
        spj:              { ko: "스페셜 저지",  en: "Special Judge",        ja: "スペシャルジャッジ", pl: "Special Judge" },
        subtask:          { ko: "서브태스크",    en: "Subtask",              ja: "サブタスク",         pl: "Subtask" },
        interactive:      { ko: "인터랙티브",    en: "Interactive",          ja: "インタラクティブ",   pl: "Interaktywne" },
        func:             { ko: "함수 구현",     en: "Function",             ja: "関数実装",           pl: "Funkcja" },
        partial:          { ko: "부분 점수",     en: "Partial Score",        ja: "部分点",             pl: "Punkty częściowe" },
        "two-steps":      { ko: "투 스텝",       en: "Two Steps",            ja: "ツーステップ",       pl: "Two Steps" },
        "language-restrict": { ko: "언어 제한",  en: "Language Restriction", ja: "言語制限",           pl: "Ograniczenie języka" },
        preparing:        { ko: "준비 중",       en: "Preparing",            ja: "準備中",             pl: "W przygotowaniu" },
        unofficial:       { ko: "번외",          en: "Unofficial",           ja: "番外",               pl: "Nieoficjalne" },
        multilang:        { ko: "다국어",        en: "Multilingual",         ja: "多言語",             pl: "Wielojęzyczne" },
    };

    function getParams() {
        const p = new URLSearchParams(location.search);
        return { id: p.get("id"), lang: p.get("lang") };
    }

    function bucket(pid) {
        return String(Math.floor(parseInt(pid, 10) / 1000)).padStart(2, "0");
    }

    function problemUrl(pid) {
        return `${PROBLEMS_BASE}/${bucket(pid)}/${pid}.html`;
    }

    async function loadProblem(pid) {
        const container = document.getElementById("problem-container");
        container.innerHTML = '<p class="loading">Loading...</p>';

        const url = problemUrl(pid);
        let resp;
        try {
            resp = await fetch(url);
        } catch (e) {
            container.innerHTML = `<p class="error">Failed to fetch ${pid}: ${e.message}</p>`;
            return null;
        }
        if (!resp.ok) {
            container.innerHTML = `<p class="error">Problem ${pid} not found (${resp.status})</p>`;
            return null;
        }

        const html = await resp.text();
        container.innerHTML = html;

        const article = container.querySelector("article");
        if (article) {
            const b = bucket(pid);
            article.querySelectorAll("img").forEach((img) => {
                const src = img.getAttribute("src") || "";
                if (src.startsWith("./assets/")) {
                    img.setAttribute("src", `${PROBLEMS_BASE}/${b}/${src.slice(2)}`);
                }
            });
        }
        return article;
    }

    function saveOriginalContent(article) {
        const locale = article.dataset.locale || "ko";
        const title = article.querySelector(':scope > h1[data-kind="title"]');
        const saved = {
            locale: locale,
            title: title ? title.innerHTML : "",
            sections: {},
        };
        ["description", "input", "output", "constraint", "hint"].forEach((kind) => {
            const sec = article.querySelector(`:scope > section[data-kind="${kind}"]`);
            if (sec) saved.sections[kind] = sec.innerHTML;
        });
        originalContent = saved;
    }

    function buildLangToggle(article, currentLang) {
        const toggle = document.getElementById("lang-toggle");
        toggle.innerHTML = "";

        const locale = article.dataset.locale || "ko";
        const langs = [locale];
        article.querySelectorAll('section[data-kind="translation"]').forEach((s) => {
            const l = s.getAttribute("lang");
            if (l && !langs.includes(l)) langs.push(l);
        });

        if (langs.length <= 1) {
            toggle.style.display = "none";
            return locale;
        }

        const activeLang = currentLang && langs.includes(currentLang) ? currentLang : locale;
        toggle.style.display = "flex";

        langs.forEach((lang) => {
            const btn = document.createElement("button");
            btn.textContent = lang.toUpperCase();
            btn.className = lang === activeLang ? "active" : "";
            btn.addEventListener("click", () => switchLang(article, lang));
            toggle.appendChild(btn);
        });

        return activeLang;
    }

    const LIMIT_I18N = {
        "time-limit": {
            ko: (v, u, e) => `${v} 초` + (e ? ` (${e})` : ""),
            en: (v, u, e) => `${v} ${u}` + (e ? ` (${e})` : ""),
            ja: (v, u, e) => `${v} 秒` + (e ? ` (${e})` : ""),
            pl: (v, u, e) => `${v} ${u}` + (e ? ` (${e})` : ""),
        },
        "memory-limit": {
            _: (v, u, e) => `${v} MiB` + (e ? ` (${e})` : ""),
        },
    };

    function updateInfoBar(article, lang) {
        article.querySelectorAll('span[data-kind="time-limit"], span[data-kind="memory-limit"]').forEach((span) => {
            const kind = span.dataset.kind;
            const val = span.dataset.value || "";
            const unit = span.dataset.unit || "";
            const extra = span.dataset.extra || "";
            const fns = LIMIT_I18N[kind];
            const fn = fns[lang] || fns._ || fns.en;
            span.textContent = fn(val, unit, extra);
        });
        article.querySelectorAll('span[data-tag]').forEach((span) => {
            const tag = span.dataset.tag;
            const entry = TAG_I18N[tag];
            if (entry) {
                span.textContent = entry[lang] || entry.en || tag;
            }
        });
    }

    function switchLang(article, targetLang) {
        const locale = originalContent.locale;

        const url = new URL(location.href);
        url.searchParams.set("lang", targetLang);
        history.replaceState(null, "", url);

        document.querySelectorAll(".lang-toggle button").forEach((btn) => {
            btn.className = btn.textContent.toLowerCase() === targetLang ? "active" : "";
        });

        article.dataset.displayLang = targetLang;

        const mainTitle = article.querySelector(':scope > h1[data-kind="title"]');

        if (targetLang === locale) {
            if (mainTitle) mainTitle.innerHTML = originalContent.title;
            Object.entries(originalContent.sections).forEach(([kind, html]) => {
                const sec = article.querySelector(`:scope > section[data-kind="${kind}"]`);
                if (sec) sec.innerHTML = html;
            });
        } else {
            const trans = article.querySelector(
                `section[data-kind="translation"][lang="${targetLang}"]`
            );
            if (!trans) return;

            const transTitle = trans.querySelector('h1[data-kind="title"]');
            if (mainTitle && transTitle) {
                mainTitle.innerHTML = transTitle.innerHTML;
            }

            ["description", "input", "output", "hint"].forEach((kind) => {
                const mainSec = article.querySelector(`:scope > section[data-kind="${kind}"]`);
                const transSec = trans.querySelector(`section[data-kind="${kind}"]`);
                if (mainSec && transSec) {
                    mainSec.innerHTML = transSec.innerHTML;
                    mainSec.style.display = "";
                } else if (mainSec && !transSec) {
                    mainSec.style.display = "none";
                }
            });
        }

        updateInfoBar(article, targetLang);

        if (window.MathJax && MathJax.typesetPromise) {
            MathJax.typesetPromise([article]).catch(() => {});
        }

        const titleEl = article.querySelector('h1[data-kind="title"]');
        if (titleEl) document.title = titleEl.textContent;
    }

    async function init() {
        const { id, lang } = getParams();
        if (!id) {
            document.getElementById("problem-container").innerHTML =
                '<p class="error">No problem ID specified. Use ?id=1000</p>';
            return;
        }

        document.title = `Problem ${id}`;

        const article = await loadProblem(id);
        if (!article) return;

        saveOriginalContent(article);

        const activeLang = buildLangToggle(article, lang);
        article.dataset.displayLang = activeLang;

        updateInfoBar(article, activeLang);

        if (activeLang !== originalContent.locale) {
            switchLang(article, activeLang);
        }

        if (window.MathJax && MathJax.typesetPromise) {
            MathJax.typesetPromise([article]).catch(() => {});
        }

        const titleEl = article.querySelector('h1[data-kind="title"]');
        if (titleEl) document.title = titleEl.textContent;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
