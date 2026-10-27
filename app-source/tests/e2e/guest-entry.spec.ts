import {test as publicTest,expect} from "@playwright/test";
import {DATA_KEY,TEST_USER_ID} from "./authenticated";
import {initialState} from "../../src/lib/domain";

const GUEST_DATA_KEY="james-fitness-user-v1:jfs-local-guest-v1";
const GUEST_MODE_KEY="jfs-guest-mode-v1";

publicTest("Welcome: guest entry is optional and uses a separate local data key",async({page})=>{
  await page.route("https://*.supabase.co/**",route=>route.abort());
  await page.goto("/login/");
  await expect(page.getByRole("heading",{name:"訓練，由你開始。"})).toBeVisible();
  await expect(page.getByRole("button",{name:/不登入，直接開始/})).toBeVisible();
  await page.getByRole("button",{name:/不登入，直接開始/}).click();
  await expect(page).toHaveURL(/\/today\/?$/);
  await expect(page.locator(".app.page-today")).toBeVisible();
  const before=await page.evaluate(()=>({
    flag:localStorage.getItem("jfs-guest-mode-v1"),
    guest:localStorage.getItem("james-fitness-user-v1:jfs-local-guest-v1"),
    account:localStorage.getItem("james-fitness-user-v1:00000000-0000-4000-8000-000000000042"),
  }));
  expect(before.flag).toBe("active");
  await expect.poll(async()=>page.evaluate(key=>localStorage.getItem(key),GUEST_DATA_KEY)).toBeTruthy();
  expect(before.account).toBeNull();
  await page.locator(".today-v3-water-actions").getByRole("button",{name:/\+250 ml/}).click();
  const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),GUEST_DATA_KEY);
  expect(stored.waters).toHaveLength(1);
  await page.reload();
  await expect(page.locator(".today-v3-water-total")).toContainText("250");
  await page.getByRole("button",{name:"帳戶選單"}).click();
  await page.getByRole("button",{name:"退出訪客模式"}).click();
  await expect(page).toHaveURL(/\/login\/?$/);
  expect(await page.evaluate(key=>localStorage.getItem(key),GUEST_DATA_KEY)).toBeTruthy();
  expect(await page.evaluate(key=>localStorage.getItem(key),GUEST_MODE_KEY)).toBeNull();
});

publicTest("Guest import: explicit consent copies only into empty account, leaves guest backup",async({page})=>{
  await page.route("https://*.supabase.co/**",route=>route.abort());
  const enc=(value:object)=>Buffer.from(JSON.stringify(value)).toString("base64url");
  const exp=Math.floor(Date.now()/1000)+7*24*60*60;
  const token=[enc({alg:"none",typ:"JWT"}),enc({
    sub:TEST_USER_ID,aud:"authenticated",role:"authenticated",exp,
  }),"test-only-unsigned"].join(".");
  const created=new Date().toISOString();
  const session={
    access_token:token,token_type:"bearer",expires_in:7*24*60*60,expires_at:exp,
    refresh_token:"invalid-browser-test-only-refresh",
    user:{id:TEST_USER_ID,aud:"authenticated",role:"authenticated",
      email:"test@example.invalid",app_metadata:{provider:"google",providers:["google"]},
      user_metadata:{},created_at:created,updated_at:created},
  };
  const guestData={...initialState(),
    waters:[{id:"guest-water",date:"2026-10-27",ml:370,createdAt:"2026-10-27T05:00:00Z"}],
  };
  await page.addInitScript(({cachedSession,guestKey,data})=>{
    localStorage.setItem("jfs-google-session-v1",JSON.stringify(cachedSession));
    localStorage.setItem(guestKey,JSON.stringify(data));
  },{cachedSession:session,guestKey:GUEST_DATA_KEY,data:guestData});
  await page.goto("/today/");
  const offer=page.getByRole("complementary",{name:"訪客訓練紀錄轉移"});
  await expect(offer).toBeVisible();
  const guestBefore=await page.evaluate(key=>localStorage.getItem(key),GUEST_DATA_KEY);
  page.on("dialog",dialog=>void dialog.accept());
  await offer.getByRole("button",{name:"複製訪客紀錄"}).click();
  await expect(offer).toHaveCount(0);
  const result=await page.evaluate(({accountKey,guestKey})=>({
    account:JSON.parse(localStorage.getItem(accountKey)!),
    guest:localStorage.getItem(guestKey),
  }),{accountKey:DATA_KEY,guestKey:GUEST_DATA_KEY});
  expect(result.account.waters).toHaveLength(1);
  expect(result.account.waters[0].ml).toBe(370);
  expect(result.guest).toBe(guestBefore);
});
