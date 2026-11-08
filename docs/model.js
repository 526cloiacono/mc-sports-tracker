export const uid = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
export const cents = v => Math.round(Number(v) * 100);
export const remaining = (s, c) => c.qty - s.sales.filter(x => x.cardId === c.id).reduce((n, x) => n + x.qty, 0);
export function totals(s) { const revenue = s.sales.reduce((n, x) => n + x.total, 0), cost = s.sales.reduce((n, x) => n + x.cost, 0), fees = s.sales.reduce((n, x) => n + x.fees, 0), expenses = s.expenses.reduce((n, x) => n + x.amount, 0); return { revenue, cost, fees, expenses, profit: revenue - cost - fees - expenses, inventory: s.cards.reduce((n, c) => n + remaining(s, c) * c.cost, 0), quantity: s.cards.reduce((n, c) => n + remaining(s, c), 0) }; }
export function cardMilestone(state, quantity) {
    const previous = state.cardsAdded ?? state.cards.reduce((sum, card) => sum + card.qty, 0);
    const cardsAdded = previous + quantity;
    const milestone = Math.floor(cardsAdded / 25) * 25;
    return {cardsAdded, milestone: milestone > previous ? milestone : 0};
}

// Selling fees are displayed in Expenses, but the sale remains their source.
export function expenseEntries(state) {
    const manual = state.expenses.map(expense => ({...expense, source: 'manual'}));
    const saleFees = state.sales.filter(sale => sale.fees > 0).map(sale => ({
        id: sale.id,
        name: sale.name,
        category: 'Selling fees & shipping',
        date: sale.date,
        amount: sale.fees,
        ...(sale.showId ? {showId: sale.showId} : {}),
        source: 'sale'
    }));
    return [...manual, ...saleFees];
}
export function addSale(s, cardId, qty, total, fees, date, showId) { const c = s.cards.find(x => x.id === cardId); if (!c || !Number.isInteger(qty) || qty < 1 || qty > remaining(s, c))
    throw Error('Choose an available quantity.'); if (![total, fees].every(x => Number.isSafeInteger(x) && x >= 0))
    throw Error('Enter valid nonnegative amounts.'); s.sales.push({ id: uid(), cardId, qty, total, fees, cost: qty * c.cost, date, name: c.name, details: c.details, cert: c.cert, ...(showId ? {showId} : {}) });
    if (c.showQty !== undefined) c.showQty = Math.min(c.showQty, remaining(s, c)); }
export function validate(s) { if (!s || s.version !== 1 || !['cards', 'sales', 'expenses'].every(k => Array.isArray(s[k])))
    throw Error('Invalid MC Sports backup.');
    if (s.cardsAdded !== undefined && (!Number.isSafeInteger(s.cardsAdded) || s.cardsAdded < 0))
        throw Error('Invalid cards added count.');
    if (s.shows !== undefined && !Array.isArray(s.shows)) throw Error('Invalid shows.');
    for (const show of s.shows || []) {
        if (!show || typeof show.id !== 'string' || typeof show.name !== 'string' || !show.name.trim() || typeof show.location !== 'string' || !show.location.trim() || !validShowDate(show.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(show.time) || typeof show.notes !== 'string') throw Error('Enter a show name, location, valid date and time.');
    }
    const showIds = new Set((s.shows || []).map(show => show.id));
    for (const record of [...s.sales, ...s.expenses]) {
        if (record.showId !== undefined && !showIds.has(record.showId)) throw Error('Choose an existing show.');
    }
    const ids = new Set(); for (const x of [...s.cards, ...s.sales, ...s.expenses, ...(s.shows || [])]) {
    if (typeof x.id !== 'string' || ids.has(x.id))
        throw Error('Invalid record ID.');
    ids.add(x.id);
} const money = x => Number.isSafeInteger(x) && x >= 0; for (const c of s.cards) {
    if (typeof c.name !== 'string' || typeof c.details !== 'string' || typeof c.cert !== 'string' || !['Raw', 'PSA', 'SGC', 'Other'].includes(c.grading) || typeof c.grade !== 'string' || !Number.isInteger(c.qty) || c.qty < 1 || !money(c.cost))
        throw Error('Invalid card.');
    if (c.grading === 'PSA' && (!/^\d{6,12}$/.test(c.cert) || c.qty !== 1))
        throw Error('Invalid PSA cert or quantity.');
    if (c.grading !== 'Raw' && (c.qty !== 1 || !c.cert.trim() || !c.grade.trim())) throw Error('Graded purchases need a cert, grade, and quantity 1.');
} for (const x of s.sales) {
    const c = s.cards.find(c => c.id === x.cardId);
    if (!c || !Number.isInteger(x.qty) || x.qty < 1 || ![x.total, x.fees, x.cost].every(money) || x.cost !== x.qty * c.cost || typeof x.date !== 'string' || typeof x.name !== 'string')
        throw Error('Invalid sale.');
} for (const c of s.cards)
    {
    if (remaining(s, c) < 0) throw Error('Oversold inventory.');
    if (c.showQty !== undefined && (!Number.isInteger(c.showQty) || c.showQty < 0 || c.showQty > remaining(s, c))) throw Error('Show quantity must be between zero and available inventory.');
} for (const e of s.expenses)
    if (!money(e.amount) || typeof e.name !== 'string' || typeof e.category !== 'string' || typeof e.date !== 'string')
        throw Error('Invalid expense.'); return s; }
export const inPeriod = (date, from, to) => (!from || date >= from) && (!to || date <= to);
export function periodTotals(s, from = "", to = "") { return totals({ ...s, sales: s.sales.filter(x => inPeriod(x.date, from, to)), expenses: s.expenses.filter(x => inPeriod(x.date, from, to)) }); }


// Show quantities are optional so backups from earlier versions remain valid.
export function setShowQuantity(s, cardId, qty) {
    const card = s.cards.find(c => c.id === cardId);
    if (!card || !Number.isSafeInteger(qty) || qty < 0 || qty > remaining(s, card)) {
        throw Error('Choose a show quantity between zero and the number available.');
    }
    card.showQty = qty;
}

export function showTotals(s) {
    return s.cards.reduce((sum, card) => {
        const qty = card.showQty || 0;
        return { quantity: sum.quantity + qty, cost: sum.cost + qty * card.cost,
            entries: sum.entries + (qty > 0 ? 1 : 0) };
    }, { quantity: 0, cost: 0, entries: 0 });
}

export function inventoryAge(purchaseDate, today) {
    if (!validShowDate(purchaseDate) || !validShowDate(today) || purchaseDate > today) return null;
    return (Date.parse(today) - Date.parse(purchaseDate)) / 86400000;
}

export function showRecap(s, showId) {
    const sales = s.sales.filter(sale => sale.showId === showId);
    const expenses = s.expenses.filter(expense => expense.showId === showId);
    return {
        ...totals({cards: [], sales, expenses}),
        saleCount: sales.length,
        expenseCount: expenses.length
    };
}

export function removeShow(s, showId) {
    s.shows = (s.shows || []).filter(show => show.id !== showId);
    for (const record of [...s.sales, ...s.expenses]) {
        if (record.showId === showId) delete record.showId;
    }
}

export const isCertSearch = (s, query = '') => !!query.trim() && s.cards.some(c => c.cert && c.cert.toLowerCase().includes(query.trim().toLowerCase()));

export function selectCards(s, { query = '', grading = 'all', status = 'available', sort = 'recent', showOnly = false } = {}) {
    const q = query.trim().toLowerCase(), certSearch = isCertSearch(s, q);
    const cards = s.cards.filter(c => {
        const available = remaining(s, c);
        return (!showOnly || c.showQty > 0)
            && (showOnly || status === 'all' || (status === 'sold' ? available === 0 : available > 0))
            && (grading === 'all' || (grading === 'Graded' && c.grading !== 'Raw') || c.grading === grading)
            && `${c.name} ${c.details} ${c.cert} ${c.notes || ''}`.toLowerCase().includes(q);
    });
    const order = new Map(s.cards.map((c, i) => [c.id, i]));
    const comparators = {
        recent: (a, b) => order.get(b.id) - order.get(a.id),
        name: (a, b) => a.name.localeCompare(b.name),
        'cost-high': (a, b) => b.cost - a.cost,
        'cost-low': (a, b) => a.cost - b.cost,
        quantity: (a, b) => remaining(s, b) - remaining(s, a),
        oldest: (a, b) => {
            const aDate = validShowDate(a.purchaseDate) ? a.purchaseDate : '9999-99-99';
            const bDate = validShowDate(b.purchaseDate) ? b.purchaseDate : '9999-99-99';
            return aDate.localeCompare(bDate);
        }
    };
    return cards.sort(comparators[sort] || comparators.recent);
}

export function saleInsights(s, from = '', to = '') {
    const sales = s.sales.filter(x => inPeriod(x.date, from, to));
    const quantity = sales.reduce((n, x) => n + x.qty, 0);
    const saleProfit = sales.reduce((n, x) => n + x.total - x.cost - x.fees, 0);
    return { transactions: sales.length, quantity, saleProfit,
        averageProfit: quantity ? Math.round(saleProfit / quantity) : 0 };
}



export function validShowDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + 'T12:00:00');
    return !Number.isNaN(d.getTime()) && d.getFullYear() === Number(value.slice(0,4)) && d.getMonth()+1 === Number(value.slice(5,7)) && d.getDate() === Number(value.slice(8,10));
}
export function matchingCardQuantity(s, cards, status = 'available') {
    return cards.reduce((n,c)=>n+(status === 'sold' ? c.qty - remaining(s,c) : remaining(s,c)),0);
}
