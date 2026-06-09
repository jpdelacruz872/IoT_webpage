let known_printers = [];

async function load_printers() {
    const grid = document.getElementById('printers_grid');
    try {
        const response = await fetch('/printing/status');
        if (!response.ok) throw new Error('backend not available');
        const printers = await response.json();
        known_printers = Array.isArray(printers) ? printers : [];
        render_printers(known_printers);
        populate_printer_dropdown(known_printers);
    } catch (e) {
        grid.innerHTML = '<p id="printers_loading">Printer telemetry will appear here once the printing backend is connected.</p>';
    }
}

function render_printers(printers) {
    const grid = document.getElementById('printers_grid');
    if (!printers || printers.length === 0) {
        grid.innerHTML = '<p id="printers_loading">No printers connected.</p>';
        return;
    }
    grid.innerHTML = '';
    printers.forEach(p => {
        const status_class = (p.status || '').toLowerCase();
        const progress = p.progress ?? 0;
        const card = document.createElement('article');
        card.className = 'printer_card';
        card.innerHTML = `
            <h3>${p.name || 'Printer'}</h3>
            <span class="printer_status ${status_class}">${p.status || 'unknown'}</span>
            <p><strong>Job:</strong> ${p.job || '—'}</p>
            <p><strong>Progress:</strong> ${progress}%</p>
            <div class="progress_bar">
                <div class="progress_bar_fill" style="width: ${progress}%;"></div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function populate_printer_dropdown(printers) {
    const select = document.getElementById('queue_printer');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">Any available</option>';
    printers.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name || '';
        opt.textContent = p.name || 'Printer';
        select.appendChild(opt);
    });
    if (current) select.value = current;
}

async function prefill_user_from_session() {
    try {
        const resp = await fetch('/get_session');
        const data = await resp.json();
        const user_input = document.getElementById('queue_user');
        if (data.user && user_input && !user_input.value) {
            user_input.value = `${data.user.first_name ?? ''} ${data.user.last_name ?? ''}`.trim();
        }
    } catch (e) {
        // not logged in or session unavailable — leave blank
    }
}

async function load_queue() {
    const list = document.getElementById('queue_list');
    try {
        const resp = await fetch('/printing/queue');
        if (!resp.ok) throw new Error('queue endpoint error');
        const items = await resp.json();
        render_queue(items);
    } catch (e) {
        list.innerHTML = '<li id="queue_loading">Could not load queue.</li>';
    }
}

function render_queue(items) {
    const list = document.getElementById('queue_list');
    if (!items || items.length === 0) {
        list.innerHTML = '<li id="queue_empty">The queue is empty. Be the first to sign up.</li>';
        return;
    }
    list.innerHTML = '';
    items.forEach((item, idx) => {
        const li = document.createElement('li');
        li.className = 'queue_item';
        const submitted = item.created_at
            ? new Date(item.created_at).toLocaleString()
            : '';
        const printer_chip = item.printer
            ? `<span class="queue_chip">${item.printer}</span>`
            : '<span class="queue_chip">Any printer</span>';
        const duration_chip = item.duration_min
            ? `<span class="queue_chip">~${item.duration_min} min</span>`
            : '';
        li.innerHTML = `
            <div class="queue_position">${idx + 1}</div>
            <div class="queue_body">
                <p class="queue_job">${escape_html(item.job_name || 'Untitled job')}</p>
                <p class="queue_meta">
                    ${printer_chip}
                    ${duration_chip}
                    Submitted by <strong>${escape_html(item.user_name || 'Anonymous')}</strong>
                    ${submitted ? ` — ${submitted}` : ''}
                </p>
            </div>
        `;
        list.appendChild(li);
    });
}

function escape_html(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function show_form_msg(text, kind) {
    const el = document.getElementById('queue_form_msg');
    el.textContent = text;
    el.className = kind || '';
}

async function submit_queue(event) {
    event.preventDefault();
    const btn = document.getElementById('queue_submit_btn');
    const user = document.getElementById('queue_user').value.trim();
    const job = document.getElementById('queue_job').value.trim();
    const printer = document.getElementById('queue_printer').value || null;
    const duration_raw = document.getElementById('queue_duration').value;
    const duration_min = duration_raw ? Number(duration_raw) : null;

    if (!user || !job) {
        show_form_msg('Name and job are required.', 'err');
        return;
    }
    btn.disabled = true;
    show_form_msg('Submitting...', '');
    try {
        const resp = await fetch('/printing/queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_name: user,
                job_name: job,
                printer,
                duration_min,
            })
        });
        if (!resp.ok) {
            const data = await resp.json().catch(() => ({}));
            throw new Error(data.error || `HTTP ${resp.status}`);
        }
        show_form_msg('Added to queue.', 'ok');
        document.getElementById('queue_job').value = '';
        document.getElementById('queue_duration').value = '';
        await load_queue();
    } catch (e) {
        show_form_msg(`Could not add: ${e.message}`, 'err');
    } finally {
        btn.disabled = false;
    }
}

function init_printing() {
    load_printers();
    prefill_user_from_session();
    load_queue();
    const form = document.getElementById('queue_form');
    if (form) form.addEventListener('submit', submit_queue);
    setInterval(load_queue, 10000);
}

init_printing();
