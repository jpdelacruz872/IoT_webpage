const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
const INVENTORY_TABLE = window.INVENTORY_TABLE || 'Inventory';
const LATENCY_TABLE = window.LATENCY_TABLE || 'latency_test';

const inventory_state = new Map();
const pending_trials = new Map();

const status_el = document.getElementById('inventory_realtime_status');
const status_label = document.getElementById('rt_label');
const tbody = document.getElementById('inventory_tbody');

const trials_input = document.getElementById('latency_trials');
const run_btn = document.getElementById('run_latency_btn');
const log_el = document.getElementById('latency_log');
const metric_n = document.getElementById('latency_n');
const metric_mean = document.getElementById('latency_mean');
const metric_min = document.getElementById('latency_min');
const metric_max = document.getElementById('latency_max');

function set_rt_status(state, label) {
    status_el.classList.remove('connected', 'error');
    if (state) status_el.classList.add(state);
    status_label.textContent = label;
}

function stock_status(item) {
    const q = Number(item.quantity ?? 0);
    const t = Number(item.threshold ?? 0);
    if (q <= 0) return 'out';
    if (q <= t) return 'low';
    return 'ok';
}

function render_inventory() {
    const items = Array.from(inventory_state.values())
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" id="inventory_loading">No items found.</td></tr>';
        return;
    }
    tbody.innerHTML = '';
    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.dataset.id = item.id;
        const status = stock_status(item);
        const updated = item.updated_at
            ? new Date(item.updated_at).toLocaleString()
            : '—';
        tr.innerHTML = `
            <td>${item.name ?? '—'}</td>
            <td>${item.quantity ?? 0}</td>
            <td>${item.threshold ?? '—'}</td>
            <td><span class="stock_pill ${status}">${status.toUpperCase()}</span></td>
            <td>${updated}</td>
        `;
        tbody.appendChild(tr);
    });
}

function flash_row(id) {
    const row = tbody.querySelector(`tr[data-id="${id}"]`);
    if (!row) return;
    row.classList.remove('flash');
    void row.offsetWidth;
    row.classList.add('flash');
}

async function load_initial_inventory(client) {
    const { data, error } = await client.from(INVENTORY_TABLE).select('*');
    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" id="inventory_loading">Could not load inventory: ${error.message}</td></tr>`;
        return;
    }
    inventory_state.clear();
    (data || []).forEach(row => inventory_state.set(row.id, row));
    render_inventory();
}

function handle_inventory_event(payload) {
    const { eventType, new: new_row, old: old_row } = payload;
    if (eventType === 'DELETE') {
        inventory_state.delete(old_row.id);
    } else {
        inventory_state.set(new_row.id, new_row);
    }
    render_inventory();
    if (new_row?.id) flash_row(new_row.id);
}

function handle_latency_event(payload) {
    console.log('[latency] realtime event received:', payload);
    const row = payload.new;
    if (!row?.trial_id) {
        console.warn('[latency] event has no trial_id', payload);
        return;
    }
    const pending = pending_trials.get(row.trial_id);
    if (!pending) {
        console.warn('[latency] no pending trial for', row.trial_id);
        return;
    }
    pending.resolve(performance.now() - pending.t0);
    pending_trials.delete(row.trial_id);
}

function append_log(line) {
    log_el.textContent += line + '\n';
    log_el.scrollTop = log_el.scrollHeight;
}

function single_trial(trial_id, timeout_ms = 5000) {
    return new Promise(resolve => {
        const timer = setTimeout(() => {
            console.warn('[latency] timeout for', trial_id, '— pending:', Array.from(pending_trials.keys()));
            pending_trials.delete(trial_id);
            resolve(null);
        }, timeout_ms);
        pending_trials.set(trial_id, {
            t0: performance.now(),
            resolve: (delta) => { clearTimeout(timer); resolve(delta); }
        });
        console.log('[latency] sending ping', trial_id);
        fetch('/inventory/latency_ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trial_id })
        }).catch(err => {
            console.error('[latency] ping fetch failed', err);
            clearTimeout(timer);
            pending_trials.delete(trial_id);
            resolve(null);
        });
    });
}

async function run_latency_test() {
    const n = Math.max(1, Math.min(200, Number(trials_input.value) || 20));
    run_btn.disabled = true;
    log_el.textContent = '';
    metric_n.textContent = metric_mean.textContent = metric_min.textContent = metric_max.textContent = '—';
    append_log(`Running ${n} trial(s)...`);
    const samples = [];
    for (let i = 0; i < n; i++) {
        const trial_id = `trial_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}`;
        const elapsed = await single_trial(trial_id);
        if (elapsed != null) {
            samples.push(elapsed);
            append_log(`#${i + 1}: ${elapsed.toFixed(1)} ms`);
        } else {
            append_log(`#${i + 1}: timed out`);
        }
    }
    if (samples.length > 0) {
        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        const min = Math.min(...samples);
        const max = Math.max(...samples);
        metric_n.textContent = samples.length;
        metric_mean.textContent = `${mean.toFixed(1)} ms`;
        metric_min.textContent = `${min.toFixed(1)} ms`;
        metric_max.textContent = `${max.toFixed(1)} ms`;
        append_log(`\nN=${samples.length}, mean=${mean.toFixed(1)} ms, range=${min.toFixed(1)}–${max.toFixed(1)} ms`);
    } else {
        append_log('No samples collected — check backend and realtime subscription.');
    }
    run_btn.disabled = false;
}

function init_inventory() {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        set_rt_status('error', 'Supabase JS client not loaded');
        console.error('[init] window.supabase missing — the @supabase/supabase-js CDN script did not load');
        return;
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        set_rt_status('error', 'Missing Supabase credentials');
        console.error('[init] missing SUPABASE_URL or SUPABASE_ANON_KEY');
        return;
    }
    console.log(`[init] connecting to ${SUPABASE_URL}, inventory=${INVENTORY_TABLE}, latency=${LATENCY_TABLE}`);
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.__sb = client;

    load_initial_inventory(client);

    client.channel(`inventory_changes_${Date.now()}`)
        .on('postgres_changes',
            { event: '*', schema: 'public', table: INVENTORY_TABLE },
            handle_inventory_event)
        .subscribe(status => {
            console.log(`[inventory channel] status: ${status}`);
        });

    client.channel(`latency_changes_${Date.now()}`)
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: LATENCY_TABLE },
            handle_latency_event)
        .subscribe(status => {
            console.log(`[latency channel] status: ${status}`);
            if (status === 'SUBSCRIBED') {
                set_rt_status('connected', 'Real-time channel connected');
            } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
                set_rt_status('error', `Real-time channel: ${status}`);
            }
        });

    run_btn.addEventListener('click', run_latency_test);
}

init_inventory();
