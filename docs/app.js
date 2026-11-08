import {renderProfitChart} from './profit-chart.js?v=20261107-mobile1';
import { uid, cents, remaining, totals, addSale, validate, inPeriod, periodTotals, selectCards, saleInsights, matchingCardQuantity, inventoryAge, showRecap, removeShow, expenseEntries, cardMilestone } from './model.js?v=20261108-milestones1';
const $ = s => document.querySelector(s), key = 'cardledger-v1', fresh = () => ({ version: 1, cards: [], sales: [], expenses: [], shows: [] });
const compactChart = window.matchMedia('(max-width: 560px)');
let state = fresh(), tab = 'home', mode, id;
let calendarMonth = new Date(new Date().getFullYear(),new Date().getMonth(),1);
let calendarRefreshTimer;
let guideActive = false;
let account = null, revision = null, ready = false, busy = false, generation = 0;
import { client, loadPortfolio, writePortfolio } from './cloud.js';
const iconPaths = {
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10Z"/>',
 inventory:'<rect x="4" y="5" width="11" height="15" rx="2"/><path d="M9 3h9a2 2 0 0 1 2 2v12M7 15l3-4 3 4"/>',
 show:'<path d="M3 10h18l-2-6H5l-2 6ZM5 10v10h14V10M9 20v-6h6v6M3 10a3 3 0 0 0 4 2 3 3 0 0 0 5 0 3 3 0 0 0 5 0 3 3 0 0 0 4-2"/>',
 sales:'<path d="m4 17 6-6 4 3 6-9m-6 0h6v6M4 21h16"/>',
 expenses:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h3"/>',
 profit:'<path d="M12 3v18m5-14H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
 quantity:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.inventory}</svg>`;
for (const button of document.querySelectorAll('nav button[data-tab]')) button.innerHTML=icon(button.dataset.tab)+`<span>${button.textContent}</span>`;
function lock() {
    const blocked = !ready || busy;
    for (const selector of ['#add','#calendar-add','#restore','#import-local','#clear-show','#calendar-view .calendar-event[data-action]','#content button','#form button[type="submit"]'])
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
    $('#welcome-line').textContent = user ? `Welcome back${names[0] ? ', '+names[0] : ''}. Make your next move.` : 'A LITTLE ORGANIZATION. A BIGGER NEXT MOVE.';
    $('#account-name').textContent = user ? `${label}’s workspace` : 'Welcome back.';
}
async function loadAccount(user) {
    const token = ++generation;
    account = user; ready = false; revision = null; state = fresh();
    guideActive = false;
    $('#show-recap').close();
    $('#card-milestone').close();
    $('#reviews-dialog').close();
    $('#review-form').reset();
    $('#modal').close(); $('#print-sheet').innerHTML=''; render(); lock();
    showWorkspace(user);
    $('#auth-form').hidden = !!user;
    $('#auth-entry').hidden = !!user;
    $('#open-login').hidden = !!user;
    $('#account-panel').hidden = !user;
    if (!user) $('#account-dialog').close();
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
        const guideStatus = guidePreference();
        guideActive = guideStatus === 'started' || (!guideStatus && !state.sales.length);
        if (guideActive) guidePreference('started');
        $('#cloud-status').textContent='Connected · records are private to your account';
        render();
    } catch(e) { if(token === generation) $('#cloud-status').textContent='Could not load cloud records: '+e.message; }
    finally { if(token === generation) lock(); }
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const milestoneDialog = $('#card-milestone');
const reviewsDialog = $('#reviews-dialog');
const reviewForm = $('#review-form');
const reviewStatus = $('#review-status');
let reviewRequest = 0;

$('#milestone-socials').replaceChildren(
    ...Array.from(document.querySelectorAll('.social-links a'), link => link.cloneNode(true))
);

function openMilestone(count) {
    $('#milestone-title').textContent = `${count.toLocaleString()} cards added!`;
    milestoneDialog.showModal();
}
$('#close-milestone').onclick = $('#milestone-later').onclick = () => milestoneDialog.close();
$('#milestone-review').onclick = () => {
    milestoneDialog.close();
    openReviews(true);
};

function showReviewForm() {
    if (!account) {
        reviewsDialog.close();
        $('#signin-dialog').showModal();
        return;
    }
    reviewForm.hidden = false;
    $('#write-review').hidden = true;
    reviewForm.elements.rating.focus();
}

async function openReviews(compose = false) {
    const request = ++reviewRequest;
    $('#review-list').textContent = 'Loading reviews…';
    reviewStatus.textContent = '';
    reviewForm.hidden = true;
    $('#write-review').hidden = false;
    reviewsDialog.showModal();
    if (compose) showReviewForm();
    try {
        const {data, error} = await client.from('tracker_reviews')
            .select('rating,body').order('created_at', {ascending: false}).limit(20);
        if (request !== reviewRequest || !reviewsDialog.open) return;
        if (error) throw error;
        $('#review-list').innerHTML = data.length
            ? data.map(review => `
                <article class="tracker-review">
                    <span class="review-stars" role="img" aria-label="${review.rating} out of 5 stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
                    <small>Anonymous</small>
                    <p>${esc(review.body)}</p>
                </article>`).join('')
            : '<p>No published reviews yet.</p>';
    } catch {
        if (request === reviewRequest && reviewsDialog.open) $('#review-list').textContent = 'Reviews are unavailable right now. Try again later.';
    }
}
$('#open-reviews').onclick = () => openReviews();
$('#write-review').onclick = showReviewForm;
$('#close-reviews').onclick = () => reviewsDialog.close();

reviewForm.onsubmit = async event => {
    event.preventDefault();
    if (!account || reviewForm.querySelector('button').disabled) return;
    const {rating, body} = Object.fromEntries(new FormData(reviewForm));
    const comment = body.trim();
    if (comment.length < 3) {
        reviewStatus.textContent = 'Enter a short comment.';
        return;
    }
    const submit = reviewForm.querySelector('button');
    const request = reviewRequest;
    submit.disabled = true;
    reviewStatus.textContent = 'Submitting review…';
    try {
        const {error} = await client.from('tracker_reviews').insert({rating: Number(rating), body: comment});
        if (request !== reviewRequest || !reviewsDialog.open) return;
        if (error) {
            reviewStatus.textContent = error.code === '23505'
                ? 'You’ve already submitted a review.'
                : 'Could not submit your review. Please try again.';
            return;
        }
        reviewForm.reset();
        reviewForm.hidden = true;
        reviewStatus.textContent = 'Thanks! Your review will appear anonymously after approval.';
    } catch {
        if (request === reviewRequest && reviewsDialog.open) reviewStatus.textContent = 'Could not submit your review. Please try again.';
    } finally {
        submit.disabled = false;
    }
};

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
function guidePreference(value) {
    if (!account) return null;
    const storageKey = `mc-sports-quick-start:${account.id}`;
    try {
        if (value) localStorage.setItem(storageKey, value);
        return localStorage.getItem(storageKey);
    } catch {
        return null;
    }
}

function renderGuide(isHome) {
    const guide = $('#quick-start');
    guide.hidden = !isHome || !ready || !guideActive;
    if (guide.hidden) return;

    const steps = ['Add your first card', 'Record a sale', 'See your profit'];
    const current = state.sales.length ? 2 : state.cards.length ? 1 : 0;
    const descriptions = [
        'Enter the card and what you paid for it.',
        'Choose a card in Inventory and tap Sell.',
        'Your profit chart is ready. See what you made after costs, fees, and expenses.'
    ];
    guide.innerHTML = `
        <div class="quick-start-head">
            <div><p class="panel-kicker">STEP ${current + 1} OF 3</p><h2>Get started</h2></div>
            <button type="button" data-guide="dismiss">Dismiss</button>
        </div>
        <ol>${steps.map((step, index) => `<li ${index === current ? 'aria-current="step"' : ''}>${step}</li>`).join('')}</ol>
        <p>${descriptions[current]}</p>
        <button type="button" class="primary" data-guide="${current}">${steps[current]}</button>`;
}

$('#quick-start').onclick = e => {
    const action = e.target.closest('[data-guide]')?.dataset.guide;
    if (action === '0') open('card');
    if (action === '1') {
        tab = 'inventory';
        $('#search').value = '';
        $('#status-filter').value = 'available';
        $('#filter').value = 'all';
        render();
        $('#section-title').scrollIntoView({block: 'start'});
    }
    if (action === '2' || action === 'dismiss') {
        guideActive = false;
        guidePreference('done');
        if (action === '2') {
            $('#from').value = '';
            $('#to').value = '';
            render();
            $('#profit-chart').scrollIntoView({block: 'start'});
        } else {
            renderGuide(true);
        }
    }
};

const showName = showId => (state.shows || []).find(show => show.id === showId)?.name;
const showTag = showId => showName(showId) ? `<small>Show: ${esc(showName(showId))}</small>` : '';

function showPicker(selected = '') {
    const shows = (state.shows || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    return `<label class="wide">Show (optional)
        <select name="showId"><option value="">No show</option>
        ${shows.map(show => `<option value="${esc(show.id)}" ${show.id === selected ? 'selected' : ''}>${esc(show.name)} · ${esc(show.date)}</option>`).join('')}
        </select>
    </label>`;
}

function openRecap(showId) {
    const show = (state.shows || []).find(show => show.id === showId);
    if (!show) return;
    const recap = showRecap(state, showId);
    const lines = [
        ['Sales revenue', recap.revenue],
        ['Cost of sold cards', recap.cost],
        ['Selling fees', recap.fees],
        ['Show expenses', recap.expenses],
        ['Net profit', recap.profit]
    ];
    $('#recap-details').innerHTML = `
        <p class="recap-show"><b>${esc(show.name)}</b><br>${esc(show.date)} · ${esc(show.location)}</p>
        <dl class="recap-totals">
            ${lines.map(([label, value]) => `<div><dt>${label}</dt><dd>${money(value)}</dd></div>`).join('')}
        </dl>
        <p class="recap-note">${recap.saleCount} ${recap.saleCount === 1 ? 'sale' : 'sales'} · ${recap.expenseCount} ${recap.expenseCount === 1 ? 'expense' : 'expenses'} tagged to this show.</p>
        <p class="recap-note">Assign a show when recording a sale or expense, or use Tag show on an existing record.</p>`;
    $('#show-recap').showModal();
}
$('#close-recap').onclick = () => $('#show-recap').close();

function render() {
    clearTimeout(calendarRefreshTimer);
    queueMicrotask(lock);
    const from = $('#from').value, to = $('#to').value;
    if (['home','sales','expenses'].includes(tab) && from && to && from > to) {
        $('#period-error').textContent = 'From date must be before To date.';
        return;
    }
    $('#period-error').textContent = '';
    const all = totals(state), period = periodTotals(state, from, to);
    const insights = saleInsights(state, from, to);
    $('main').dataset.page = tab;
    $('#hero-count').textContent = all.quantity.toLocaleString();
    $('#hero-value').textContent = money(all.inventory);
    const isCards = tab === 'inventory';
    const isShows = tab === 'show';
    const isHome = tab === 'home';
    renderGuide(isHome);
    for (const selector of ['.heading','#stats','#profit-chart','#sales-summary','#insights','.formula']) $(selector).hidden = !isHome;
    $('.report-controls').hidden = !['home','sales','expenses'].includes(tab);
    $('#records-panel').hidden = isHome;
    $('#shows-calendar').hidden = !isShows;
    $('#sales-summary').innerHTML = `<span>Sales revenue <b>${money(period.revenue)}</b></span><span>Sold card costs <b>${money(period.cost)}</b></span><span>Selling fees <b>${money(period.fees)}</b></span><span>${from || to ? 'Selected period' : 'All time'} · inventory shown at current cost</span>`;
    $('#stats').innerHTML = [
        ['Net profit', money(period.profit), 'After cost, fees & expenses'],
        ['Inventory value', money(all.inventory), 'At purchase cost · unsold cards'],
        ['Cards on hand', all.quantity, 'Total individual cards owned'],
        ['Total expenses', money(period.expenses + period.fees), 'Includes selling fees · excludes card costs']
    ].map((x, i) => `<div class="stat"><div class="stat-top"><label>${x[0]}</label><span class="stat-icon">${icon(['profit','inventory','quantity','expenses'][i])}</span></div><strong class="${i === 0 ? (period.profit < 0 ? 'negative' : 'positive') : ''}">${x[1]}</strong><small>${x[2]}</small></div>`).join('');
    if (isHome) renderProfitChart($('#profit-chart'),state,from,to,compactChart.matches);
    $('#insights').innerHTML = `<span><b>${insights.transactions}</b> ${insights.transactions === 1 ? 'sale' : 'sales'} recorded</span><span><b>${insights.quantity}</b> cards sold</span><span><b>${insights.quantity ? money(insights.averageProfit) : '—'}</b> average profit / sold card <small>before business expenses</small></span>`;
    $('#crumb').textContent = tab === 'show' ? 'SHOWS' : tab.toUpperCase();
    $('#page-kicker').textContent = {home:'OVERVIEW',inventory:'01 / THE COLLECTION',show:'02 / ON THE ROAD',sales:'04 / YOUR TRACK RECORD',expenses:'05 / THE DETAILS'}[tab];
    $('#section-title').textContent = { home: 'Home', inventory: 'Your inventory', show: 'Your shows', sales: 'Sales history', expenses: 'Business expenses' }[tab];
    $('#section-sub').textContent = { home: 'Your collection at a glance.', inventory: 'A home for every card in your collection.', show: 'Plan your next show and keep the details together.', sales: 'Every sale, with its true profit.', expenses: 'Selling fees, table fees, supplies, travel, and more.' }[tab];
    $('#add').textContent = tab === 'expenses' ? '＋ Add expense' : isShows ? '＋ Add show' : '＋ Add card';
    $('#add').hidden = tab === 'sales';
    $('#filter').hidden = !isCards;
    $('#sort').hidden = !isCards;
    $('#status-filter').hidden = tab !== 'inventory';
    $('#show-summary').hidden = $('#print-show').hidden = $('#clear-show').hidden = true;
    $('#search').placeholder = tab === 'show' ? 'Search shows, locations or notes…' : tab === 'expenses' ? 'Search expenses or categories…' : 'Search player, set, card # or cert…';
    document.querySelectorAll('nav button[data-tab]').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tab);
        button.setAttribute('aria-pressed', String(button.dataset.tab === tab));
    });
    const q = $('#search').value.toLowerCase(), grading = $('#filter').value;
    let rows = '', heads = [], count = 0;
    if (isCards) {
        const cards = selectCards(state, { query: q, grading, status: $('#status-filter').value,
            sort: $('#sort').value });
        count = cards.length;
        const inventoryDate = today();
        heads = ['Card / player', 'Grade / cert', 'Purchased', 'Owned', 'Cost / card', 'Actions'];
        rows = cards.map(c => {
            const available = remaining(state, c);
            const age = available > 0 ? inventoryAge(c.purchaseDate, inventoryDate) : null;
            const ageLabel = age === null ? '' : age === 0 ? 'Purchased today' : `${age} ${age === 1 ? 'day' : 'days'} in stock`;
            const owned = state.cards.filter(x => x.name.toLowerCase() === c.name.toLowerCase() && x.details.toLowerCase() === c.details.toLowerCase() && x.grading === c.grading && x.grade === c.grade).reduce((n, x) => n + remaining(state, x), 0);
            return `<tr><td><b>${esc(c.name)}</b><small>${esc(c.details) || 'No set details'}</small>${c.notes ? `<small>${esc(c.notes)}</small>` : ''}</td>
                <td><span class="badge">${esc(c.grading)} ${esc(c.grade)}</span><small>${c.cert ? '#' + esc(c.cert) : 'Ungraded'}</small></td>
                <td>${esc(c.purchaseDate) || 'Date not recorded'}<small>${c.qty} purchased in this entry</small>${ageLabel ? `<small class="inventory-age">${ageLabel}</small>` : ''}</td><td><b>${available}</b><small>${owned} matching in collection</small></td><td>${money(c.cost)}</td>
                <td class="actions">${available > 0 ? `<button data-action="sell" data-id="${esc(c.id)}">Sell</button>` : '<span class="sold-badge">Sold out</span>'}<button data-action="edit" data-id="${esc(c.id)}">Edit</button><button data-action="remove" data-id="${esc(c.id)}">Remove</button></td></tr>`;
        }).join('');
    }
    if (tab === 'sales') {
        heads = ['Card', 'Date', 'Qty', 'Sale total', 'Fees', 'Profit', 'Actions'];
        const sales = state.sales.filter(x => inPeriod(x.date, from, to) && `${x.name} ${x.cert} ${x.details || ''}`.toLowerCase().includes(q)).slice().sort((a, b) => b.date.localeCompare(a.date));
        count = sales.length;
        rows = sales.map(x => `<tr><td><b>${esc(x.name)}</b><small>${esc(x.details || '')}</small><small>${esc(x.cert)}</small>${showTag(x.showId)}</td><td>${esc(x.date)}</td><td>${x.qty}</td><td>${money(x.total)}</td><td>${money(x.fees)}</td><td><b class="${x.total - x.cost - x.fees < 0 ? 'negative' : 'positive'}">${money(x.total - x.cost - x.fees)}</b></td><td class="actions"><button data-action="tagSale" data-id="${esc(x.id)}">Tag show</button><button data-action="undo" data-id="${esc(x.id)}">Undo sale</button></td></tr>`).join('');
    }
    if (tab === 'expenses') {
        heads = ['Expense', 'Category', 'Date', 'Amount', 'Actions'];
        const expenses = expenseEntries(state).filter(x => inPeriod(x.date, from, to) && (x.name + ' ' + x.category).toLowerCase().includes(q)).slice().sort((a, b) => b.date.localeCompare(a.date));
        count = expenses.length;
        rows = expenses.map(expense => {
            const actions = expense.source === 'sale'
                ? '<small>Recorded with sale</small>'
                : `<button data-action="tagExpense" data-id="${esc(expense.id)}">Tag show</button>
                   <button data-action="deleteExpense" data-id="${esc(expense.id)}">Remove</button>`;
            return `<tr><td><b>${esc(expense.name)}</b>${showTag(expense.showId)}</td>
                <td>${esc(expense.category)}</td><td>${esc(expense.date)}</td><td>${money(expense.amount)}</td>
                <td class="actions">${actions}</td></tr>`;
        }).join('');
    }
    if (tab === 'show') {
        const shows = (state.shows || []).filter(x => `${x.name} ${x.location} ${x.notes}`.toLowerCase().includes(q)).slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
        count = shows.length;
        heads = ['Show', 'Location', 'Date', 'Time', 'Notes', 'Actions'];
        rows = shows.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.location)}</td><td>${esc(x.date)}</td><td>${esc(x.time)}</td><td class="show-notes">${esc(x.notes)}</td><td class="actions"><button data-action="recap" data-id="${esc(x.id)}">Recap</button><button data-action="editShow" data-id="${esc(x.id)}">Edit</button><button data-action="deleteShow" data-id="${esc(x.id)}">Remove</button></td></tr>`).join('');
    }
    if (isShows) renderCalendar();
    const matching = isCards ? selectCards(state,{query:q,grading,status:$('#status-filter').value}) : [];
    $('#result-count').textContent = `${count} ${isShows ? (count === 1 ? 'show' : 'shows') : (count === 1 ? 'record' : 'records')} shown` + (isCards && q ? ` · ${matchingCardQuantity(state,matching,$('#status-filter').value)} ${$('#status-filter').value === 'sold' ? 'sold' : 'available'} cards in this search` : '');
    const filtered = q || (isCards && grading !== 'all') || (tab === 'inventory' && $('#status-filter').value !== 'available');
    const emptyTitle = filtered ? 'No matching records' : tab === 'show' ? 'Plan your next show.' : tab === 'inventory' ? 'Your next flip starts here.' : 'No records yet.';
    const emptyBody = filtered ? 'Try another search or change your filters.' : tab === 'show' ? 'Add a show with its location, date, time, and notes. It will appear on your calendar.' : tab === 'inventory' ? 'Add your first card to start tracking your collection and profit.' : 'Your records will appear here as you add them.';
    $('#content').innerHTML = rows ? `<table role="table"><thead role="rowgroup"><tr role="row">${heads.map(x => `<th role="columnheader" scope="col">${x}</th>`).join('')}</tr></thead><tbody role="rowgroup">${rows}</tbody></table>` : `<div class="empty"><b>${emptyTitle}</b>${emptyBody}</div>`;
    for (const row of $('#content').querySelectorAll('tbody tr')) {
        row.setAttribute('role', 'row');
        Array.from(row.cells).forEach((cell, index) => {
            cell.setAttribute('role', 'cell');
            cell.dataset.label = heads[index];
        });
    }
}
function renderCalendar() {
    const currentDate = today();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    calendarRefreshTimer = setTimeout(render, midnight.getTime() - Date.now());
    const year=calendarMonth.getFullYear(), month=calendarMonth.getMonth();
    const start=new Date(year,month,1).getDay(), days=new Date(year,month+1,0).getDate();
    const dateKey=day=>`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const monthShows = (state.shows || [])
        .filter(show => show.date.startsWith(dateKey(1).slice(0, 7)))
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const eventAttributes = show => show.date < currentDate
        ? 'class="calendar-event is-past" disabled'
        : `class="calendar-event" data-action="editShow" data-id="${esc(show.id)}"`;
    const agenda = monthShows.map(show => {
        const date = new Date(show.date + 'T12:00:00');
        const dayLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return `<button ${eventAttributes(show)}>
            <time datetime="${esc(show.date)}">${esc(dayLabel)} · ${esc(show.time)}</time>
            <b>${esc(show.name)}</b><small>${esc(show.location)}</small>
        </button>`;
    }).join('');
    let cells=Array.from({length:start},()=>'<div class="calendar-day blank" aria-hidden="true"></div>').join('');
    for(let day=1;day<=days;day++) {
        const date=dateKey(day), shows=monthShows.filter(show => show.date === date);
        cells+=`<div class="calendar-day ${date === currentDate ? 'today' : date < currentDate ? 'past' : ''} ${shows.length ? 'has-events' : ''}"><time datetime="${date}">${day}</time>${shows.map(x=>`<button ${eventAttributes(x)} title="${esc(x.location)}"><b>${esc(x.time)} · ${esc(x.name)}</b><small>${esc(x.location)}</small></button>`).join('')}</div>`;
    }
    $('#calendar-view').innerHTML=`<div class="calendar-toolbar"><button data-month="-1" aria-label="Previous month">←</button><h3>${calendarMonth.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</h3><button data-month="1" aria-label="Next month">→</button><button data-month="today">Today</button></div><div class="calendar-grid">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div class="weekday">${d}</div>`).join('')}${cells}</div><section class="calendar-agenda" aria-label="Shows this month"><h4>Shows this month</h4>${agenda || '<p>No shows scheduled this month.</p>'}</section>`;
}
$('#calendar-view').onclick=e=> {
    const month=e.target.closest('[data-month]');
    if(month) { calendarMonth=month.dataset.month==='today' ? new Date(new Date().getFullYear(),new Date().getMonth(),1) : new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+Number(month.dataset.month),1); render();return; }
    const event=e.target.closest('[data-action="editShow"]');if(event) open('editShow',event.dataset.id);
};
const input = (name, label, value = '', type = 'text', extra = '') => `<label>${label}<input name="${name}" value="${esc(value)}" type="${type}" ${extra}></label>`;
function open(kind, recordId) {
    if(!ready || busy) return;
    mode = kind;
    id = recordId;
    $('#error').textContent = '';
    let c = state.cards.find(x => x.id === id);
    $('#modal-title').textContent = { card: 'Add a card', edit: 'Edit card', sell: 'Record a sale', expense: 'Add expense', showEvent: 'Add show', editShow: 'Edit show', tagSale: 'Tag sale to a show', tagExpense: 'Tag expense to a show' }[kind];
    if (kind === 'card' || kind === 'edit') {
        $('#fields').innerHTML = `<label>Card type<select name="cardType"><option value="Raw">Raw</option><option value="Graded" ${c && c.grading !== 'Raw' ? 'selected' : ''}>Graded</option></select></label><label>Grading company<select name="grading">${['PSA','SGC','Other'].map(g=>`<option ${c?.grading===g?'selected':''}>${g}</option>`).join('')}</select></label>` + input('cert', 'Cert number', c?.cert || '', 'text', 'maxlength="80"') + input('name', 'Player / card name', c?.name || '', 'text', 'required maxlength="120"') + input('details', 'Year, set, card #, parallel', c?.details || '', 'text', 'maxlength="200"') + input('grade', 'Grade', c?.grade || '', 'text', 'maxlength="30"') + input('qty', 'Quantity purchased', c?.qty || 1, 'number', 'required min="1" step="1"') + input('cost', 'Cost per card ($)', c ? c.cost / 100 : '', 'number', 'required min="0" step="0.01"') + input('purchaseDate', 'Purchase date', c?.purchaseDate || (c ? '' : today()), 'date', c ? '' : 'required') + input('notes', 'Notes', c?.notes || '', 'text', 'maxlength="500"') + '<small class="wide">Each entry is a separate purchase with its own date and cost. You can reuse a cert for another purchase. Add graded slabs one at a time; record sales against the purchase you are selling.</small>';
        // Suggestions are rebuilt from this account's cloud-loaded purchases only.
        const savedNames = [...new Map(state.cards.map(card => {
            const name = card.name.trim().replace(/\s+/g, ' ');
            return [name.toLocaleLowerCase(), name];
        }).filter(([key]) => key)).values()].sort((a,b) => a.localeCompare(b));
        const nameField = $('[name="name"]'), oldLabel=nameField.closest('label');
        const wrapper=document.createElement('div');wrapper.className='card-name-field';
        oldLabel.replaceWith(wrapper);
        wrapper.innerHTML='<label for="card-name">Player / card name</label>';
        nameField.id='card-name';nameField.autocomplete='off';
        nameField.setAttribute('role','combobox');nameField.setAttribute('aria-autocomplete','list');
        nameField.setAttribute('aria-controls','card-name-options');nameField.setAttribute('aria-expanded','false');
        nameField.setAttribute('aria-describedby','name-suggestion-help');wrapper.append(nameField);
        wrapper.insertAdjacentHTML('beforeend','<small id="name-suggestion-help">Type to choose a saved name, or enter a new one.</small><div id="card-name-options" class="name-options" role="listbox" aria-label="Saved card names" hidden></div>');
        const options=wrapper.querySelector('.name-options');let matches=[],active=-1;
        const hideNames=()=>{options.hidden=true;nameField.setAttribute('aria-expanded','false');nameField.removeAttribute('aria-activedescendant');active=-1;};
        const chooseName=i=>{nameField.value=matches[i];hideNames();nameField.focus();};
        const updateNames=()=>{
            active=-1;const query=nameField.value.trim().toLocaleLowerCase();
            matches=query?savedNames.filter(name=>name.toLocaleLowerCase().includes(query)).slice(0,8):[];
            options.innerHTML=matches.map((name,i)=>`<button type="button" role="option" id="saved-name-${i}" aria-selected="false" data-name-index="${i}" tabindex="-1">${esc(name)}</button>`).join('');
            options.hidden=!matches.length;nameField.setAttribute('aria-expanded',String(!!matches.length));nameField.removeAttribute('aria-activedescendant');
        };
        nameField.oninput=updateNames;nameField.onfocus=updateNames;
        nameField.onblur=hideNames;
        options.onpointerdown=e=>e.preventDefault();
        options.onclick=e=>{const button=e.target.closest('[data-name-index]');if(button)chooseName(Number(button.dataset.nameIndex));};
        nameField.onkeydown=e=>{
            if(e.key==='Escape'){hideNames();e.stopPropagation();return;}
            if(options.hidden)return;
            if(e.key==='Enter' && active>=0){e.preventDefault();chooseName(active);return;}
            if(e.key==='ArrowDown' || e.key==='ArrowUp'){
                e.preventDefault();active=active<0?(e.key==='ArrowDown'?0:matches.length-1):(active+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length;
                options.querySelectorAll('button').forEach((button,i)=>button.setAttribute('aria-selected',String(i===active)));
                nameField.setAttribute('aria-activedescendant',`saved-name-${active}`);
            }
        };
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
    if (kind === 'showEvent' || kind === 'editShow') {
        const show = (state.shows || []).find(x=>x.id===id);
        $('#fields').innerHTML = input('name','Show name',show?.name || '', 'text','required maxlength="120"') + input('location','Location',show?.location || '', 'text','required maxlength="200"') + input('date','Date',show?.date || today(),'date','required') + input('time','Time',show?.time || '09:00','time','required') + `<label class="wide">Notes<textarea name="notes" rows="4" maxlength="2000">${esc(show?.notes || '')}</textarea></label>`;
    }
    if (kind === 'expense')
        $('#fields').innerHTML = input('name', 'Expense description', '', 'text', 'required maxlength="120"') + `<label>Category<select name="category"><option>Show / table fees</option><option>Supplies</option><option>Travel</option><option>Subscriptions</option><option>Other</option></select></label>` + input('amount', 'Amount ($)', '', 'number', 'required min="0.01" step="0.01"') + input('date', 'Date', today(), 'date', 'required') + '<small class="wide">Selling fees entered on a sale appear here automatically. Enter other business expenses here.</small>';
    if ((kind === 'sell' || kind === 'expense') && state.shows?.length) {
        $('#fields').insertAdjacentHTML('beforeend', showPicker());
    }
    if (kind === 'tagSale' || kind === 'tagExpense') {
        const records = kind === 'tagSale' ? state.sales : state.expenses;
        const record = records.find(item => item.id === id);
        if (!record) return;
        $('#fields').innerHTML = `<p class="wide">${esc(record.name)} · ${esc(record.date)}</p>` + showPicker(record.showId);
    }
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
        let milestone = 0;
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
            else {
                const progress = cardMilestone(next, c.qty);
                next.cardsAdded = progress.cardsAdded;
                milestone = progress.milestone;
                next.cards.push(c);
            }
        }
        if (mode === 'showEvent' || mode === 'editShow') {
            const show = {id: id || uid(),name:d.name.trim(),location:d.location.trim(),date:d.date,time:d.time,notes:d.notes.trim()};
            next.shows ||= [];
            if (mode === 'editShow') Object.assign(next.shows.find(x=>x.id===id),show); else next.shows.push(show);
        }
        if (mode === 'sell')
            addSale(next, id, Number(d.qty), cents(d.total), cents(d.fees), d.date, d.showId);
        if (mode === 'expense') {
            if (!d.name.trim())
                throw Error('Enter a description.');
            next.expenses.push({ id: uid(), name: d.name.trim(), category: d.category, amount: cents(d.amount), date: d.date, ...(d.showId ? {showId: d.showId} : {}) });
        }
        if (mode === 'tagSale' || mode === 'tagExpense') {
            const records = mode === 'tagSale' ? next.sales : next.expenses;
            const record = records.find(item => item.id === id);
            if (!record) throw Error('This record no longer exists.');
            if (d.showId) record.showId = d.showId;
            else delete record.showId;
        }
        await save(next);
        $('#modal').close();
        if (milestone) openMilestone(milestone);
        if (mode === 'sell' && guideActive && state.sales.length === 1) {
            tab = 'home';
            render();
            $('#quick-start').scrollIntoView({block: 'start'});
        }
    }
    catch (e) {
        $('#error').textContent = e.message;
    }
};
$('#content').onclick = async e => { const b = e.target.closest('[data-action]'); if (!b)
    return; const { action, id } = b.dataset; if (action === 'recap') return openRecap(id);
    if (['sell', 'edit', 'editShow', 'tagSale', 'tagExpense'].includes(action))
    return open(action, id); const n = structuredClone(state);
    if (action === 'remove' && n.sales.some(s => s.cardId === id))
    return alert('This card has recorded sales. Undo its sales first to remove it, so your profit history stays accurate.'); if (!confirm(action === 'undo' ? 'Undo this sale and return its quantity to inventory?' : action === 'deleteShow' ? 'Remove this show? Its sales and expenses will be kept without a show tag.' : 'Remove this record? Export a backup first if you may need it later.'))
    return; if(action === 'deleteShow') removeShow(n, id); if (action === 'remove')
    n.cards = n.cards.filter(x => x.id !== id); if (action === 'undo')
    n.sales = n.sales.filter(x => x.id !== id); if (action === 'deleteExpense')
    n.expenses = n.expenses.filter(x => x.id !== id); try {
    await save(n);
}
catch (e) {
    alert(e.message);
} };
$('#calendar-add').onclick = () => open('showEvent');
$('#add').onclick = () => open(tab === 'show' ? 'showEvent' : tab === 'expenses' ? 'expense' : 'card');
$('#hero-add').onclick = () => account ? open('card') : $('#signin-dialog').showModal();
$('#hero-inventory').onclick = () => { tab='inventory'; $('#search').value=''; render(); };
$('#close').onclick = () => $('#modal').close();
$('.brand').onclick = e => { e.preventDefault(); tab='home'; $('#search').value=''; render(); };
document.querySelectorAll('nav button[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; $('#search').value = ''; render(); });
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
$('#csv').onclick = () => { const data = tab === 'show' ? state.shows || [] : tab === 'inventory' ? state.cards.map(c=>({...c,remaining:remaining(state,c)})) : tab === 'expenses' ? expenseEntries(state) : state[tab]; if (!data.length)
    return alert('No records to export.'); const fields = [...new Set(data.flatMap(r => Object.keys(r)))].filter(k => k !== 'ask'), cell = v => '"' + String(v ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"'; download([fields.map(cell).join(','), ...data.map(r => fields.map(k => cell(r[k])).join(','))].join('\r\n'), 'mc-sports-' + tab + '-cents.csv', 'text/csv'); $('#notice').textContent = 'CSV exported. Monetary fields are in cents.'; };
compactChart.addEventListener('change', () => { if (tab === 'home') render(); });
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
$('#open-account').onclick=()=> account ? $('#account-dialog').showModal() : $('#signin-dialog').showModal();
$('#close-account').onclick=()=>$('#account-dialog').close();
$('#open-login').onclick=()=> { if(!account && !$('#signin-dialog').open) $('#signin-dialog').showModal(); };
$('#close-login').onclick=()=>$('#signin-dialog').close();
$('#signin-dialog').addEventListener('close',()=> { $('#password').value=''; });
for (const selector of ['#signup-dialog','#reset-dialog']) {
    $(selector).addEventListener('close',()=> {
        if(!account && !document.querySelector('dialog[open]')) $('#signin-dialog').showModal();
    });
}
const redirectTo = new URL('./', import.meta.url).href;
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
function openPasswordReset() {
    $('#account-dialog').close();
    $('#signin-dialog').close();
    $('#reset-form').reset(); $('#reset-email').value=account?.email || $('#email').value.trim();
    $('#reset-email').readOnly=!!account;
    $('#reset-message').textContent=''; $('#reset-dialog').showModal();
};
$('#open-reset').onclick=openPasswordReset;
$('#account-reset').onclick=openPasswordReset;
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
