import { textContrast } from "./text-contrast";
import {test,expect,DATA_KEY} from './authenticated';
import {trainingFixture,segment} from '../fixtures/training-v3';
import {dateInZone} from '../../src/lib/domain';
const key=DATA_KEY;
test.beforeEach(async({page})=>{
 const state=trainingFixture(),session=state.sessions.find(s=>s.status==='in_progress')!;
 session.workoutDate=dateInZone();session.exercises[0].sets=[segment()];
 state.cycles![0].days[0].name='新的課表名稱';
 await page.addInitScript(({state,key})=>{if(!localStorage.getItem('jfs-training-overview-qa-seeded')){localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('jfs-training-overview-qa-seeded','true');}}, {state,key});
 await page.route('https://*.supabase.co/**',r=>r.abort());
});
test('resume shows session snapshot and does not create another session',async({page})=>{
 await page.goto('/training/');const hero=page.getByRole('region',{name:'進行中的訓練'});
 await expect(hero).toContainText('上肢訓練');await expect(hero).toContainText('胸推');await expect(hero).not.toContainText('新的課表名稱');await expect(hero).toContainText('已完成 1 /');
 await expect(page.getByRole('navigation',{name:'訓練快捷入口'}).getByRole('link')).toHaveCount(7);
 await page.getByRole('link',{name:'繼續訓練'}).click();await expect(page.getByRole('heading',{name:'上肢訓練',exact:true})).toBeVisible();
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).sessions.filter((s:any)=>s.status==='in_progress').length,key)).toBe(1);
});
test('copy last working set stays a draft; timer extensions survive reload and pause',async({page})=>{
 await page.goto('/training/session/');await page.getByRole('button',{name:'複製上一個工作組'}).click();
 const form=page.locator('.workout-set-entry');await expect(form.locator('[name=weight]')).toHaveValue('60');await expect(form.locator('[name=reps]')).toHaveValue('8');
 let s=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).sessions.find((s:any)=>s.status==='in_progress'),key);expect(s.exercises[0].sets).toHaveLength(1);
 await page.getByRole('button',{name:'完成這一組',exact:true}).click();await page.getByRole('button',{name:'+15 秒',exact:true}).click();await page.getByRole('button',{name:'+30 秒',exact:true}).click();
 await page.reload();s=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).sessions.find((s:any)=>s.status==='in_progress'),key);expect(s.restTargetSeconds).toBe(165);expect(s.exercises[0].sets).toHaveLength(2);
 await page.getByRole('button',{name:'暫停訓練',exact:true}).click();await expect(page.getByRole('button',{name:'+15 秒',exact:true})).toBeDisabled();
});
for(const width of [390,1440])test(`overview ${width}: visible hierarchy and no overflow`,async({page})=>{
 await page.setViewportSize({width,height:900});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/training/');await expect(page.getByRole('region',{name:'本週訓練狀態'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(await textContrast(page.locator('.training-v3-heading h2'))).toBeGreaterThanOrEqual(4.5);
 if(process.env.TRAINING_QA_DIR)await page.screenshot({path:process.env.TRAINING_QA_DIR+`/overview-${width}.png`,fullPage:true,animations:'disabled'});
 await page.getByRole('region',{name:'本週訓練狀態'}).getByRole('link',{name:new RegExp(dateInZone()+' ') }).click();
 await expect(page.getByRole('dialog')).toContainText(dateInZone());
 expect(errors).toEqual([]);
});
