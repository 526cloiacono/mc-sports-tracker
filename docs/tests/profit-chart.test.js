import {test} from 'node:test';
import assert from 'node:assert/strict';
import {profitSeries} from '../profit-chart.js';
const state={sales:[{date:'2026-11-01',total:10000,cost:6000,fees:500},{date:'2026-11-03',total:1000,cost:2000,fees:100}],expenses:[{date:'2026-11-02',amount:500},{date:'2026-11-03',amount:200}]};
test('chart includes sold costs, fees and expenses and ends at net profit',()=>{const {points}=profitSeries(state);assert.deepEqual(points.map(p=>p.value),[0,3500,3000,1700]);assert.deepEqual(points.map(p=>p.delta),[0,3500,-500,-1300]);});
test('selected period resets to zero and includes exact boundaries',()=>{const {points}=profitSeries(state,'2026-11-02','2026-11-03');assert.deepEqual(points.map(p=>p.value),[0,-500,-1800]);});
test('quiet days stay flat and no data produces an empty chart',()=>{const {points}=profitSeries({sales:[state.sales[0]],expenses:[]},'2026-10-01','2026-11-05');assert.deepEqual(points.map(p=>p.value),[0,0,3500,3500]);assert.equal(points.at(-1).date,'2026-11-05');assert.deepEqual(profitSeries({sales:[],expenses:[]}).points,[]);});
test('invalid or undated entries are counted, never plotted at a fake date',()=>{const result=profitSeries({sales:[{...state.sales[0],date:''}],expenses:[]});assert.equal(result.undated,1);assert.equal(result.points.length,0);});
