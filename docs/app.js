import { uid, cents, remaining, totals, addSale, validate, inPeriod, periodTotals, setShowQuantity, showTotals, selectCards, saleInsights, isCertSearch } from './model.js';
const $ = s => document.querySelector(s), key = 'cardledger-v1', fresh = () => ({ version: 1, cards: [], sales: [], expenses: [] });
let state = fresh(), tab = 'inventory', mode, id;
let account = null, revision = null, ready = false, busy = false, generation = 0;
import { client, loadPortfolio, writePortfolio } from './cloud.js';
function lock() {
    const blocked = !ready || busy;
    for (const selector of ['#add','#restore','#import-local','#clear-show','#content button','#form button[type="submit"]'])
        document.querySelectorAll(selector).forEach(b => b.disabled = blocked);
    $('#refresh-cloud').disabled = busy || !account;
    $('#signout').disabled = busy;
}
function showWorkspace(user) {
    const metadata = user?.user_metadata || {};
    const names = [metadata.first_name, metadata.last_name].filter(v => typeof v === 'string' && v.trim()).map(v => v.trim());
    const fullName = names.join(' ') || (typeof metadata.full_name === 'string' ? metadata.full_name.trim() : '');
    const label = user ? fullName || user.email || 'Your account' : 'Guest';
    $('#workspace-name').textContent = label;
    $('#workspace-name').title = label;
    $('#workspace-label').textContent = user ? 'Personal workspace' : 'Sign in to your workspace';
    $('#workspace-initials').textContent = user ? (names.length ? names.map(n => Array.from(n)[0]).join('') : Array.from(label)[0]).toUpperCase() : '?';
    $('#account-name').textContent = user ? `${label}’s workspace` : 'Welcome back.';
}
async function loadAccount(user) {
    const token = ++generation;
    account = user; ready = false; revision = null; state = fresh();
    $('#modal').close(); $('#print-sheet').innerHTML=''; render(); lock();
    showWorkspace(user);
    $('#auth-form').hidden = !!user;
    $('#auth-entry').hidden = !!user;
    $('#open-login').hidden = !!user;
    document.querySelector('main > .cloud-panel').hidden = !user;
    if (user) {
        $('#signin-dialog').close();
        $('#signup-dialog').close();
        $('#reset-dialog').close();
    } else if (!document.querySelector('dialog[open]')) {
        $('#signin-dialog').showModal();
    }
    $('#cloud-actions').hidden = !user;
    $('#signout').hidden = !user;
    if (!user) { $('#cloud-status').textContent='Signed out'; return; }
    $('#cloud-status').textContent='Loading cloud records…';
    try {
        const row = await loadPortfolio(user.id);
        if(token !== generation) return;
        state = row ? validate(row.data) : fresh(); revision = row?.revision ?? null; ready = true;
        $('#cloud-status').textContent='Connected · records are private to your account';
        render();
    } catch(e) { if(token === generation) $('#cloud-status').textContent='Could not load cloud records: '+e.message; }
    finally { if(token === generation) lock(); }
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => (n / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const today = () => new Date().toLocaleDateString('en-CA');
async function save(next) {
    if(!ready || !account || busy) throw Error('Sign in and wait for cloud records to load before saving.');
    validate(next); busy = true; lock();
    const token = generation, userId=account.id;
    $('#cloud-status').textContent='Saving to cloud…';
    try {
        const nextRevision = await writePortfolio(userId, revision, next);
        if(token !== generation) throw Error('Account changed. Reload records to check this save.');
        revision = nextRevision; state = next; render();
        $('#cloud-status').textContent='Saved to cloud';
        $('#notice').textContent='Changes saved to your account.';
    } catch(e) {
        if(token === generation) { ready=false; $('#cloud-status').textContent='Save not confirmed · refresh cloud records before editing again'; }
        throw e;
    } finally { busy = false; lock(); }
}
function render() {
    queueMicrotask(lock);
    const from = $('#from').value, to = $('#to').value;
    if (from && to && from > to) {
        $('#period-error').textContent = 'From date must be before To date.';
        return;
    }
    $('#period-error').textContent = '';
    const all = totals(state), period = periodTotals(state, from, to);
    const insights = saleInsights(state, from, to), packed = showTotals(state);
    const isCards = tab === 'inventory' || tab === 'show';
    $('#sales-summary').innerHTML = `<span>Sales revenue <b>${money(period.revenue)}</b></span><span>Sold card costs <b>${money(period.cost)}</b></span><span>Selling fees <b>${money(period.fees)}</b></span><span>${from || to ? 'Selected period' : 'All time'} · inventory shown at current cost</span>`;
    $('#stats').innerHTML = [
        ['Net profit', money(period.profit), 'After cost, fees & expenses'],
        ['Inventory value', money(all.inventory), 'At purchase cost · unsold cards'],
        ['Cards on hand', all.quantity, 'Total individual cards owned'],
        ['Business expenses', money(period.expenses), 'Excludes card costs & selling fees']
    ].map((x, i) => `<div class="stat"><label>${x[0]}</label><strong class="${i === 0 ? (period.profit < 0 ? 'negative' : 'positive') : ''}">${x[1]}</strong><small>${x[2]}</small></div>`).join('');
    $('#insights').innerHTML = `<span><b>${insights.transactions}</b> ${insights.transactions === 1 ? 'sale' : 'sales'} recorded</span><span><b>${insights.quantity}</b> cards sold</span><span><b>${insights.quantity ? money(insights.averageProfit) : '—'}</b> average profit / sold card <small>before business expenses</small></span>`;
    $('#crumb').textContent = tab === 'show' ? 'SHOW LIST' : tab.toUpperCase();
    $('#section-title').textContent = { inventory: 'Your inventory', show: 'Ready for the next show', sales: 'Sales history', expenses: 'Business expenses' }[tab];
    $('#section-sub').textContent = { inventory: 'A home for every card in your collection.', show: 'Choose your cards. Pack your case. Make your next sale.', sales: 'Every sale, with its true profit.', expenses: 'Table fees, supplies, travel, and more.' }[tab];
    $('#add').textContent = tab === 'expenses' ? '＋ Add expense' : tab === 'show' ? '＋ Choose cards' : '＋ Add card';
    $('#add').hidden = tab === 'sales';
    $('#filter').hidden = !isCards;
    $('#sort').hidden = !isCards;
    $('#status-filter').hidden = tab !== 'inventory';
    $('#show-summary').hidden = tab !== 'show';
    $('#print-show').hidden = $('#clear-show').hidden = tab !== 'show';
    $('#print-show').disabled = $('#clear-show').disabled = packed.quantity === 0;
    $('#show-summary').innerHTML = `<span><b>${packed.quantity}</b> ${packed.quantity === 1 ? 'card' : 'cards'} to bring</span><span><b>${money(packed.cost)}</b> total cost</span><small>Sales automatically cap packed quantities at remaining stock. No asking prices.</small>`;
    document.querySelectorAll('nav button').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tab);
        button.setAttribute('aria-pressed', String(button.dataset.tab === tab));
    });
    const q = $('#search').value.toLowerCase(), grading = $('#filter').value;
    let rows = '', heads = [], count = 0;
    if (isCards) {
        const cards = selectCards(state, { query: q, grading, status: $('#status-filter').value,
            sort: $('#sort').value, showOnly: tab === 'show' });
        count = cards.length;
        heads = ['Card / player', 'Grade / cert', 'Purchased', tab === 'show' ? 'Bringing / available' : 'Owned', 'Cost / card', 'Actions'];
        rows = cards.map(c => {
            const available = remaining(state, c);
            const owned = state.cards.filter(x => x.name.toLowerCase() === c.name.toLowerCase() && x.details.toLowerCase() === c.details.toLowerCase() && x.grading === c.grading && x.grade === c.grade).reduce((n, x) => n + remaining(state, x), 0);
            return `<tr><td><b>${esc(c.name)}</b><small>${esc(c.details) || 'No set details'}</small>${c.notes ? `<small>${esc(c.notes)}</small>` : ''}${c.showQty > 0 && tab !== 'show' ? `<span class="show-badge">${c.showQty} on show list</span>` : ''}</td>
                <td><span class="badge">${esc(c.grading)} ${esc(c.grade)}</span><small>${c.cert ? '#' + esc(c.cert) : 'Ungraded'}</small></td>
                <td>${esc(c.purchaseDate) || 'Date not recorded'}<small>${c.qty} purchased in this entry</small></td><td><b>${tab === 'show' ? `${c.showQty} / ${available}` : available}</b><small>${owned} matching in collection</small></td><td>${money(c.cost)}</td>
                <td class="actions">${available > 0 ? `<button data-action="sell" data-id="${esc(c.id)}">Sell</button><button data-action="show" data-id="${esc(c.id)}">${c.showQty > 0 ? 'Adjust show qty' : 'Bring to show'}</button>` : '<span class="sold-badge">Sold out</span>'}${tab === 'show' ? `<button data-action="unpack" data-id="${esc(c.id)}">Take off list</button>` : `<button data-action="edit" data-id="${esc(c.id)}">Edit</button><button data-action="remove" data-id="${esc(c.id)}">Remove</button>`}</td></tr>`;
        }).join('');
    }
    if (tab === 'sales') {
        heads = ['Card', 'Date', 'Qty', 'Sale total', 'Fees', 'Profit', 'Actions'];
        const sales = state.sales.filter(x => inPeriod(x.date, from, to) && `${x.name} ${x.cert} ${x.details || ''}`.toLowerCase().includes(q)).slice().sort((a, b) => b.date.localeCompare(a.date));
        count = sales.length;
        rows = sales.map(x => `<tr><td><b>${esc(x.name)}</b><small>${esc(x.details || '')}</small><small>${esc(x.cert)}</small></td><td>${esc(x.date)}</td><td>${x.qty}</td><td>${money(x.total)}</td><td>${money(x.fees)}</td><td><b class="${x.total - x.cost - x.fees < 0 ? 'negative' : 'positive'}">${money(x.total - x.cost - x.fees)}</b></td><td><button data-action="undo" data-id="${esc(x.id)}">Undo sale</button></td></tr>`).join('');
    }
    if (tab === 'expenses') {
        heads = ['Expense', 'Category', 'Date', 'Amount', 'Actions'];
        const expenses = state.expenses.filter(x => inPeriod(x.date, from, to) && (x.name + ' ' + x.category).toLowerCase().includes(q)).slice().sort((a, b) => b.date.localeCompare(a.date));
        count = expenses.length;
        rows = expenses.map(x => `<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.category)}</td><td>${esc(x.date)}</td><td>${money(x.amount)}</td><td><button data-action="deleteExpense" data-id="${esc(x.id)}">Remove</button></td></tr>`).join('');
    }
    $('#result-count').textContent = `${count} ${count === 1 ? 'record' : 'records'} shown · ${tab === 'inventory' && isCertSearch(state,q) ? 'Cert search includes sold purchases · ' : ''} ${tab === 'show' ? 'Print and export include your entire show list.' : 'CSV exports all records, regardless of filters.'}`;
    const filtered = q || (isCards && grading !== 'all') || (tab === 'inventory' && $('#status-filter').value !== 'available');
    const emptyTitle = filtered ? 'No matching records' : tab === 'show' ? 'Build your show lineup.' : tab === 'inventory' ? 'Your next flip starts here.' : 'No records yet.';
    const emptyBody = filtered ? 'Try another search or change your filters.' : tab === 'show' ? 'Choose cards from inventory and select Bring to show. Set the quantity you plan to pack.' : tab === 'inventory' ? 'Add your first card to start tracking your collection and profit.' : 'Your records will appear here as you add them.';
    $('#content').innerHTML = rows ? `<table><thead><tr>${heads.map(x => `<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>` : `<div class="empty"><b>${emptyTitle}</b>${emptyBody}</div>`;
}
const input = (name, label, value = '', type = 'text', extra = '') => `<label>${label}<input name="${name}" value="${esc(value)}" type="${type}" ${extra}></label>`;
function open(kind, recordId) {
    if(!ready || busy) return;
    mode = kind;
    id = recordId;
    $('#error').textContent = '';
    let c = state.cards.find(x => x.id === id);
    $('#modal-title').textContent = { card: 'Add a card', edit: 'Edit card', sell: 'Record a sale', expense: 'Add expense', show: 'Bring to a show' }[kind];
    if (kind === 'card' || kind === 'edit') {
        $('#fields').innerHTML = `<label>Card type<select name="cardType"><option value="Raw">Raw</option><option value="Graded" ${c && c.grading !== 'Raw' ? 'selected' : ''}>Graded</option></select></label><label>Grading company<select name="grading">${['PSA','SGC','Other'].map(g=>`<option ${c?.grading===g?'selected':''}>${g}</option>`).join('')}</select></label>` + input('cert', 'Cert number', c?.cert || '', 'text', 'maxlength="80"') + input('name', 'Player / card name', c?.name || '', 'text', 'required maxlength="120"') + input('details', 'Year, set, card #, parallel', c?.details || '', 'text', 'maxlength="200"') + input('grade', 'Grade', c?.grade || '', 'text', 'maxlength="30"') + input('qty', 'Quantity purchased', c?.qty || 1, 'number', 'required min="1" step="1"') + input('cost', 'Cost per card ($)', c ? c.cost / 100 : '', 'number', 'required min="0" step="0.01"') + input('purchaseDate', 'Purchase date', c?.purchaseDate || (c ? '' : today()), 'date', c ? '' : 'required') + input('notes', 'Notes', c?.notes || '', 'text', 'maxlength="500"') + '<small class="wide">Each entry is a separate purchase with its own date and cost. You can reuse a cert for another purchase. Add graded slabs one at a time; record sales against the purchase you are selling.</small>';
        const updateGrading = () => {
            const graded = $('[name="cardType"]').value === 'Graded';
            for (const name of ['grading', 'cert', 'grade']) {
                $(`[name="${name}"]`).closest('label').hidden = !graded;
                $(`[name="${name}"]`).required = graded;
            }
            $('[name="qty"]').readOnly = graded;
            if (graded) $('[name="qty"]').value = '1';
            $('[name="cert"]').maxLength = $('[name="grading"]').value === 'PSA' ? 12 : 80;
        };
        $('[name="cardType"]').onchange = updateGrading;
        $('[name="grading"]').onchange = updateGrading;
        updateGrading();
    }
    if (kind === 'sell')
        $('#fields').innerHTML = `<p class="wide">${esc(c.name)} · ${remaining(state, c)} available<br>Purchase: ${esc(c.purchaseDate) || 'Date not recorded'} · ${money(c.cost)} per card · ${esc(c.grading)} ${esc(c.cert)}</p>` + input('qty', 'Quantity sold', 1, 'number', `required min="1" max="${remaining(state, c)}" step="1"`) + input('total', 'Sold for — total ($)', '', 'number', 'required min="0" step="0.01"') + input('fees', 'Fees + seller shipping ($)', 0, 'number', 'required min="0" step="0.01"') + input('date', 'Sale date', today(), 'date', 'required');
    if (kind === 'show')
        $('#fields').innerHTML = `<p class="wide">${esc(c.name)} · ${remaining(state, c)} available<br>Purchase: ${esc(c.purchaseDate) || 'Date not recorded'} · ${money(c.cost)} per card · ${esc(c.grading)} ${esc(c.cert)}</p>` + input('showQty', 'Quantity to bring', c.showQty || 1, 'number', `required min="0" max="${remaining(state, c)}" step="1"`) + '<small class="wide">Use zero to remove this card from the list. Adding it does not change inventory or profit.</small>';
    if (kind === 'expense')
        $('#fields').innerHTML = input('name', 'Expense description', '', 'text', 'required maxlength="120"') + `<label>Category<select name="category"><option>Show / table fees</option><option>Supplies</option><option>Travel</option><option>Subscriptions</option><option>Other</option></select></label>` + input('amount', 'Amount ($)', '', 'number', 'required min="0.01" step="0.01"') + input('date', 'Date', today(), 'date', 'required') + '<small class="wide">Do not enter card purchase costs or selling fees here if already included in a card or sale.</small>';
    if (kind === 'sell') {
        $('#fields').insertAdjacentHTML('beforeend', '<div id="sale-preview" class="wide sale-preview" aria-live="polite"></div>');
        const preview = () => {
            const quantity = Number($('[name="qty"]').value), rawTotal = $('[name="total"]').value;
            const total = cents(rawTotal), fees = cents($('[name="fees"]').value);
            const valid = rawTotal !== '' && Number.isInteger(quantity) && quantity > 0 && quantity <= remaining(state, c) && [total, fees].every(v => Number.isSafeInteger(v) && v >= 0);
            $('#sale-preview').innerHTML = valid ? `Sale profit <strong class="${total - fees - quantity * c.cost < 0 ? 'negative' : 'positive'}">${money(total - fees - quantity * c.cost)}</strong><small>${money(quantity * c.cost)} card cost + ${money(fees)} selling fees. Before business expenses.</small>` : 'Enter the sale total to preview your profit.';
        };
        for (const name of ['qty', 'total', 'fees']) $(`[name="${name}"]`).oninput = preview;
        preview();
    }
    $('#modal').showModal();
}
$('#form').onsubmit = async e => {
    e.preventDefault();
    try {
        const d = Object.fromEntries(new FormData(e.target)), next = structuredClone(state);
        if (mode === 'card' || mode === 'edit') d.grading = d.cardType === 'Raw' ? 'Raw' : d.grading;
        if (mode === 'card' || mode === 'edit') {
            const old = next.cards.find(x => x.id === id);
            if (!d.name.trim())
                throw Error('Enter a card name.');
            if (d.grading === 'PSA' && (!/^\d{6,12}$/.test(d.cert) || Number(d.qty) !== 1 || !d.grade.trim()))
                throw Error('PSA slabs need a grade, a 6–12 digit cert, and quantity 1. Add each purchase separately.');
            const c = { id: id || uid(), name: d.name.trim(), details: d.details.trim(), grading: d.grading, grade: d.grading !== 'Raw' ? d.grade.trim() : '', cert: d.grading !== 'Raw' ? d.cert.trim() : '', qty: Number(d.qty), cost: cents(d.cost), purchaseDate: d.purchaseDate, notes: d.notes.trim() };
            if (old && next.sales.some(s => s.cardId === id) && (old.cost !== c.cost || old.qty !== c.qty || old.cert !== c.cert || old.grading !== c.grading))
                throw Error('This card has sales. Undo those sales before changing quantity, cost, or cert.');
            if (old) {
                c.showQty = Math.min(old.showQty || 0, c.qty - next.sales.filter(x => x.cardId === id).reduce((n, x) => n + x.qty, 0));
                Object.assign(old, c);
            }
            else
                next.cards.push(c);
        }
        if (mode === 'show') setShowQuantity(next, id, Number(d.showQty));
        if (mode === 'sell')
            addSale(next, id, Number(d.qty), cents(d.total), cents(d.fees), d.date);
        if (mode === 'expense') {
            if (!d.name.trim())
                throw Error('Enter a description.');
            next.expenses.push({ id: uid(), name: d.name.trim(), category: d.category, amount: cents(d.amount), date: d.date });
        }
        await save(next);
        $('#modal').close();
    }
    catch (e) {
        $('#error').textContent = e.message;
    }
};
$('#content').onclick = async e => { const b = e.target.closest('[data-action]'); if (!b)
    return; const { action, id } = b.dataset; if (action === 'sell' || action === 'edit' || action === 'show')
    return open(action, id); const n = structuredClone(state);
    if (action === 'unpack') { try { setShowQuantity(n, id, 0); await save(n); } catch (e) { alert(e.message); } return; }
    if (action === 'remove' && n.sales.some(s => s.cardId === id))
    return alert('This card has recorded sales. Undo its sales first to remove it, so your profit history stays accurate.'); if (!confirm(action === 'undo' ? 'Undo this sale and return its quantity to inventory?' : 'Remove this record? Export a backup first if you may need it later.'))
    return; if (action === 'remove')
    n.cards = n.cards.filter(x => x.id !== id); if (action === 'undo')
    n.sales = n.sales.filter(x => x.id !== id); if (action === 'deleteExpense')
    n.expenses = n.expenses.filter(x => x.id !== id); try {
    await save(n);
}
catch (e) {
    alert(e.message);
} };
$('#add').onclick = () => { if (tab === 'show') { tab = 'inventory'; $('#search').value = ''; $('#filter').value = 'all'; $('#status-filter').value = 'available'; render(); } else open(tab === 'expenses' ? 'expense' : 'card'); };
$('#close').onclick = () => $('#modal').close();
document.querySelectorAll('nav button').forEach(b => b.onclick = () => { tab = b.dataset.tab; $('#search').value = ''; render(); });
$('#from').onchange = render;
$('#to').onchange = render;
$('#clear-dates').onclick = () => { $('#from').value = ''; $('#to').value = ''; render(); };
$('#search').oninput = render;
$('#filter').onchange = render;
$('#sort').onchange = render;
$('#status-filter').onchange = render;
function download(text, name, type) { const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
$('#backup').onclick = () => download(JSON.stringify(state, null, 2), 'mc-sports-backup.json', 'application/json');
$('#restore').onclick = () => $('#file').click();
$('#file').onchange = async (e) => { try {
    const file = e.target.files[0];
    if (!file)
        return;
    const n = validate(JSON.parse(await file.text()));
    if (confirm('Replace your current records with this backup? Export your current data first if needed.'))
        await save(n);
}
catch (e) {
    alert(e.message);
} e.target.value = ''; };
$('#csv').onclick = () => { const data = tab === 'show' ? selectCards(state, { showOnly: true, sort: 'name' }).map(c => ({ name: c.name, details: c.details, grading: c.grading, grade: c.grade, cert: c.cert, quantityToBring: c.showQty, costPerCardCents: c.cost, packedCostCents: c.cost * c.showQty })) : tab === 'inventory' ? state.cards.map(c => ({ ...c, remaining: remaining(state, c) })) : state[tab]; if (!data.length)
    return alert('No records to export.'); const fields = [...new Set(data.flatMap(r => Object.keys(r)))].filter(k => k !== 'ask'), cell = v => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"'; download([fields.map(cell).join(','), ...data.map(r => fields.map(k => cell(r[k])).join(','))].join('\r\n'), 'mc-sports-' + tab + '-cents.csv', 'text/csv'); $('#notice').textContent = 'CSV exported. Monetary fields are in cents.'; };
$('#clear-show').onclick = async () => {
    if (!confirm('Clear your show list? Your inventory and sales will stay unchanged.')) return;
    const next = structuredClone(state);
    next.cards.forEach(c => { c.showQty = 0; });
    try { await save(next); } catch (e) { alert(e.message); }
};
$('#print-show').onclick = () => {
    const cards = selectCards(state, { showOnly: true, sort: 'name' }), total = showTotals(state);
    if (!cards.length) return;
    $('#print-sheet').innerHTML = `<h1>MC Sports · Show checklist</h1><p>${esc(today())} · ${total.quantity} cards · ${money(total.cost)} at cost</p><p>Show / location: _________________________</p><table><thead><tr><th>Packed</th><th>Card / details</th><th>Grade / cert</th><th>Qty</th><th>Unit cost</th></tr></thead><tbody>${cards.map(c => `<tr><td>☐</td><td>${esc(c.name)}<small>${esc(c.details)}</small></td><td>${esc(c.grading)} ${esc(c.grade)}<small>${esc(c.cert)}</small></td><td>${c.showQty}</td><td>${money(c.cost)}</td></tr>`).join('')}</tbody></table><p>Costs are for your reference. This checklist is not a price list.</p>`;
    window.print();
};
render();



$('#refresh-cloud').onclick=()=> { if(!busy) loadAccount(account); };
$('#signout').onclick=async()=> {
    if(busy) return;
    const {error}=await client.auth.signOut();
    if(error) $('#cloud-status').textContent=error.message;
};
$('#import-local').onclick=async()=> {
    try {
        const saved=localStorage.getItem(key);
        if(!saved) throw Error('No older browser records found on this device. You can also Restore a JSON backup.');
        const data=validate(JSON.parse(saved));
        if(!confirm('Replace your cloud collection with the records on this browser? Download a backup of your cloud records first. The browser copy will be kept.')) return;
        await save(data);
    } catch(e) { $('#notice').textContent=e.message; }
};
$('#open-login').onclick=()=> { if(!account && !$('#signin-dialog').open) $('#signin-dialog').showModal(); };
$('#close-login').onclick=()=>$('#signin-dialog').close();
$('#signin-dialog').addEventListener('close',()=> { $('#password').value=''; });
for (const selector of ['#signup-dialog','#reset-dialog']) {
    $(selector).addEventListener('close',()=> {
        if(!account && !document.querySelector('dialog[open]')) $('#signin-dialog').showModal();
    });
}
const redirectTo = 'https://526cloiacono.github.io/mc-sports-tracker/';
$('#auth-form').onsubmit=async e=> {
    e.preventDefault();
    const submit=$('#auth-form button[type="submit"]') || $('#auth-form .signin-submit');
    if(submit.disabled) return;
    submit.disabled=true; $('#auth-message').textContent='Signing in…';
    try {
        const {error}=await client.auth.signInWithPassword({email:$('#email').value.trim().toLowerCase(),password:$('#password').value});
        if(error) throw error;
        $('#password').value=''; $('#auth-message').textContent='';
    } catch(e) { $('#auth-message').textContent=e.message; }
    finally { submit.disabled=false; }
};
let resetPending=false;
$('#open-reset').onclick=()=> {
    $('#signin-dialog').close();
    $('#reset-form').reset(); $('#reset-email').value=$('#email').value.trim();
    $('#reset-message').textContent=''; $('#reset-dialog').showModal();
};
$('#close-reset').onclick=()=> { if(!resetPending) $('#reset-dialog').close(); };
$('#reset-dialog').addEventListener('cancel',e=>{if(resetPending)e.preventDefault();});
$('#reset-form').onsubmit=async e=>{
    e.preventDefault(); if(resetPending)return;
    resetPending=true; $('#reset-submit').disabled=$('#close-reset').disabled=true;
    $('#reset-message').textContent='Sending reset link…';
    try {
        const {error}=await client.auth.resetPasswordForEmail($('#reset-email').value.trim().toLowerCase(),{redirectTo});
        if(error)throw error;
        $('#reset-message').textContent='If an account uses this email, you’ll receive a reset link. Check your inbox and spam folder.';
    } catch(e){$('#reset-message').textContent=e.message;}
    finally{resetPending=false;$('#reset-submit').disabled=$('#close-reset').disabled=false;}
};
let signupPending = false;
$('#open-signup').onclick = () => {
    $('#signin-dialog').close();
    $('#signup-error').textContent = '';
    $('#signup-form').reset();
    $('#signup-confirm').setCustomValidity('');
    $('#signup-form').elements.email.value = $('#email').value.trim();
    $('#signup-dialog').showModal();
};
$('#close-signup').onclick = () => { if (!signupPending) $('#signup-dialog').close(); };
$('#signup-dialog').addEventListener('cancel', e => { if(signupPending) e.preventDefault(); });
$('#signup-dialog').addEventListener('close', () => {
    $('#signup-password').value = ''; $('#signup-confirm').value = '';
});
const checkPasswords = () => $('#signup-confirm').setCustomValidity(
    $('#signup-confirm').value && $('#signup-password').value !== $('#signup-confirm').value ? 'Passwords must match.' : '');
$('#signup-password').oninput = $('#signup-confirm').oninput = checkPasswords;
$('#signup-form').onsubmit = async e => {
    e.preventDefault();
    if(signupPending) return;
    checkPasswords();
    if(!e.target.reportValidity()) return;
    const d = Object.fromEntries(new FormData(e.target));
    const firstName = d.firstName.trim(), lastName = d.lastName.trim();
    if(!firstName || !lastName) { $('#signup-error').textContent='Enter your first and last name.'; return; }
    signupPending=true;
    $('#signup-submit').disabled=$('#close-signup').disabled=true;
    $('#signup-error').textContent='Creating your account…';
    try {
        const {data,error} = await client.auth.signUp({email:d.email.trim().toLowerCase(), password:d.password, options:{emailRedirectTo:redirectTo, data:{first_name:firstName,last_name:lastName,full_name:`${firstName} ${lastName}`}}});
        if(error && (['user_already_exists','email_exists'].includes(error.code) || /already (?:been )?registered|already exists/i.test(error.message))) throw Error('An account already exists with this email. Sign in or reset your password.');
        if(error) throw error;
        if(data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw Error('An account already exists with this email. Sign in or reset your password.');
        $('#email').value=d.email.trim().toLowerCase();
        $('#auth-message').textContent=data.session ? 'Account created. Welcome!' : 'Check your email to confirm your account, then sign in.';
        $('#signup-dialog').close();
    } catch(e) { $('#signup-error').textContent=e.message || 'Could not create your account. Please try again.'; }
    finally { signupPending=false; $('#signup-submit').disabled=$('#close-signup').disabled=false; }
};
$('#password-form').onsubmit=async e=> {
    e.preventDefault();
    const {error}=await client.auth.updateUser({password:$('#new-password').value});
    $('#password-message').textContent=error ? error.message : 'Password updated.';
    if(!error) { $('#new-password').value=''; $('#password-dialog').close(); }
};
client.auth.onAuthStateChange((event,session)=> {
    if(event==='USER_UPDATED') { account=session?.user || null; showWorkspace(account); }
    if(event==='PASSWORD_RECOVERY') { $('#signin-dialog').close(); $('#password-dialog').showModal(); }
    if(event==='INITIAL_SESSION' || event==='SIGNED_OUT' || (event==='SIGNED_IN' && session?.user.id !== account?.id))
        setTimeout(()=>loadAccount(session?.user || null),0);
});
lock();
