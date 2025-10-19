        // helper to safely access variant field names from the sheet
        function getField(item, ...names) {
            for (const n of names) {
                if (item[n] !== undefined && item[n] !== "") return item[n];
                // also try lower/upper and spaces removed
                const alt = Object.keys(item).find(k => k.toLowerCase().replace(/\s+/g,'') === n.toLowerCase().replace(/\s+/g,''));
                if (alt) return item[alt];
            }
            return "";
        }

        function parseDate(s) {
            if (!s) return null;
            // try ISO first, then fallback to common formats
            const d = new Date(s);
            return isNaN(d) ? null : d;
        }

        function formatRange(start, end) {
            if (!start && !end) return "";
            const opts = { year: 'numeric', month: 'short', day: undefined };
            const s = start ? new Date(start).toLocaleDateString(undefined, opts) : "";
            const e = end ? new Date(end).toLocaleDateString(undefined, opts) : "";
            return s && e ? `${s} — ${e}` : s || e;
        }

        function createLanguageColumn(lang, items) {
            const col = document.createElement('section');
            col.className = `language language-${lang.toLowerCase()}`;
            const heading = document.createElement('h3');
            heading.textContent = lang;
            col.appendChild(heading);

            const timeline = document.createElement('div');
            timeline.className = 'timeline';
            items.forEach(it => {
                const el = document.createElement('div');
                el.className = 'entry';
                const title = document.createElement('div');
                title.className = 'title';
                title.textContent = it.title || it.Title || '(no title)';
                const meta = document.createElement('p');
                meta.className = 'meta';
                meta.textContent = it.author || it.Author || '';
                const range = document.createElement('div');
                range.className = 'range';
                range.textContent = formatRange(it._startDate, it._endDate);

                el.appendChild(title);
                if (meta.textContent) el.appendChild(meta);
                if (range.textContent) el.appendChild(range);
                timeline.appendChild(el);
            });

            col.appendChild(timeline);
            return col;
        }

        fetch("https://opensheet.elk.sh/1YHEU6YsOIEY3CutcNp-mkavSkc722fxwp0SKoUDb10c/Sheet2")
        .then(r => r.json())
        .then(data => {
            const app = document.getElementById('app');
            app.innerHTML = ''; // clear placeholder

            // normalize and group by language
            const groups = {};
            data.forEach(raw => {
                const language = (getField(raw, 'language') || 'unknown').toString().trim().toLowerCase();
                const title = getField(raw, 'title', 'Title');
                const author = getField(raw, 'author', 'Author');
                const start = getField(raw, 'start date', 'startdate', 'Start Date') || '';
                const end = getField(raw, 'end date', 'enddate', 'End Date') || '';

                const parsedStart = parseDate(start);
                const parsedEnd = parseDate(end);

                const item = {
                    ...raw,
                    title,
                    author,
                    start,
                    end,
                    _startDate: parsedStart,
                    _endDate: parsedEnd
                };

                if (!groups[language]) groups[language] = [];
                groups[language].push(item);
            });

            // sort each group by start date (oldest first)
            Object.keys(groups).forEach(lang => {
                groups[lang].sort((a,b) => {
                    const A = a._startDate ? a._startDate.getTime() : Infinity;
                    const B = b._startDate ? b._startDate.getTime() : Infinity;
                    return A - B;
                });
            });

            // build UI: only show the languages you mentioned first (order), then others
            const order = ['japanese','korean','chinese'];
            const container = document.createElement('div');
            container.className = 'timelines';

            const shown = new Set();
            order.forEach(lang => {
                if (groups[lang]) {
                    container.appendChild(createLanguageColumn(lang, groups[lang]));
                    shown.add(lang);
                }
            });
            // remaining languages
            Object.keys(groups).forEach(lang => {
                if (!shown.has(lang)) container.appendChild(createLanguageColumn(lang, groups[lang]));
            });

            app.appendChild(container);
        })
        .catch(err => {
            const app = document.getElementById('app');
            app.textContent = 'Error loading sheet: ' + (err && err.message || err);
            console.error(err);
        });