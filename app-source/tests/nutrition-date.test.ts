import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateMealDate} from '../src/lib/nutrition-input';
test('actual intake validation uses profile local date, validates calendar dates',()=>{
 const now=new Date('2026-10-27T16:30:00Z');
 assert.equal(validateMealDate('2026-10-28','Asia/Taipei',now),'2026-10-28');
 assert.throws(()=>validateMealDate('2026-10-28','America/Los_Angeles',now),/未來日期/);
 for(const d of ['', '2026-02-30','2026-13-01'])assert.throws(()=>validateMealDate(d,'Asia/Taipei',now),/日期無效/);
});
