import {test} from 'node:test';import assert from 'node:assert/strict';import {addSale,totals,remaining,validate} from '../model.js';
const data=()=>({version:1,cards:[{id:'a',name:'Card',details:'2026',grading:'Raw',grade:'',cert:'',qty:3,cost:1000}],sales:[],expenses:[]});
test('partial sale uses sold cost only and subtracts fees and expenses',()=>{const s=data();addSale(s,'a',2,3600,200,'2026-10-26');s.expenses.push({id:'e',name:'Table',category:'Show',amount:300,date:'2026-10-26'});assert.equal(totals(s).profit,1100);assert.equal(totals(s).inventory,1000);assert.equal(remaining(s,s.cards[0]),1);validate(s);});
test('overselling and invalid values are rejected',()=>{const s=data();assert.throws(()=>addSale(s,'a',4,5000,0,''));assert.throws(()=>addSale(s,'a',1,-1,0,''));assert.throws(()=>addSale(s,'a',1.5,1000,0,''));});
test('duplicate PSA certs rejected and leading zeros retained',()=>{const s=data();s.cards=[{...s.cards[0],grading:'PSA',grade:'10',cert:'00123456',qty:1}];validate(s);s.cards.push({...s.cards[0],id:'b'});assert.throws(()=>validate(s));});
test('undo sale restores inventory and profit',()=>{const s=data();addSale(s,'a',1,1500,100,'2026-10-26');s.sales=[];assert.equal(totals(s).profit,0);assert.equal(totals(s).quantity,3);});
import {periodTotals} from '../model.js';
test('period profit includes only dated sales and expenses, including boundary days',()=>{const s=data();addSale(s,'a',1,2000,100,'2026-10-01');addSale(s,'a',1,2500,100,'2026-11-01');s.expenses.push({id:'fee',name:'table',category:'show',date:'2026-10-31',amount:200});assert.equal(periodTotals(s,'2026-10-01','2026-10-31').profit,700);assert.equal(periodTotals(s,'2026-12-01','2026-12-31').profit,0);});

import {setShowQuantity, showTotals, selectCards, saleInsights} from '../model.js';
test('show planning counts copies at cost without changing profit or inventory',()=>{
 const s=data();setShowQuantity(s,'a',2);
 assert.deepEqual(showTotals(s),{quantity:2,cost:2000,entries:1});
 assert.equal(totals(s).inventory,3000);assert.equal(totals(s).profit,0);
 assert.throws(()=>setShowQuantity(s,'a',4));assert.throws(()=>setShowQuantity(s,'a',1.5));
 assert.throws(()=>setShowQuantity(s,'a',-1));assert.throws(()=>setShowQuantity(s,'missing',1));
});
test('partial and complete sales cap packed quantities and undo does not silently repack',()=>{
 const s=data();setShowQuantity(s,'a',3);addSale(s,'a',2,3000,0,'2026-11-01');
 assert.equal(s.cards[0].showQty,1);validate(s);
 addSale(s,'a',1,1800,0,'2026-11-02');assert.equal(showTotals(s).quantity,0);validate(s);
 s.sales.pop();assert.equal(remaining(s,s.cards[0]),1);assert.equal(s.cards[0].showQty,0);validate(s);
});
test('old backups remain valid and show quantities survive backup round trips',()=>{
 const s=data();validate(s);assert.equal(showTotals(s).quantity,0);
 setShowQuantity(s,'a',2);const restored=validate(JSON.parse(JSON.stringify(s)));
 assert.equal(showTotals(restored).quantity,2);
 restored.cards[0].showQty=4;assert.throws(()=>validate(restored));
});
test('inventory search, stock filters, and sorting do not mutate source order',()=>{
 const s=data();s.cards.push({...s.cards[0],id:'b',name:'Another card',cost:2000,notes:'rookie'});
 addSale(s,'a',3,4500,0,'2026-11-01');
 assert.deepEqual(selectCards(s).map(c=>c.id),['b']);
 assert.deepEqual(selectCards(s,{status:'sold'}).map(c=>c.id),['a']);
 assert.deepEqual(selectCards(s,{query:'rookie',status:'all'}).map(c=>c.id),['b']);
 assert.deepEqual(selectCards(s,{status:'all',sort:'cost-high'}).map(c=>c.id),['b','a']);
 assert.deepEqual(s.cards.map(c=>c.id),['a','b']);
});
test('sale insights weight per-card profit by sold quantity within selected dates',()=>{
 const s=data();addSale(s,'a',2,3000,200,'2026-11-01');addSale(s,'a',1,2000,100,'2026-12-01');
 assert.deepEqual(saleInsights(s,'2026-11-01','2026-11-30'),{transactions:1,quantity:2,saleProfit:800,averageProfit:400});
 assert.equal(saleInsights(s,'2027-01-01','2027-01-31').averageProfit,0);
});

