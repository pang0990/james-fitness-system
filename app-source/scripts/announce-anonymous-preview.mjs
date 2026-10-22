/**
 * Never log a Netlify anonymous drop/claim token from CLI JSON.
 * CI shows only the temporary public URL, which is disposable within 1h.
 */
import fs from "node:fs";

const input = process.argv[2];
if (!input || !fs.existsSync(input)) throw Error("Missing anonymous deploy result");
const result = JSON.parse(fs.readFileSync(input, "utf8"));
const candidate = result.url ?? result.deploy_url ?? result.deployUrl ?? "";
const preview = new URL(candidate);
if (preview.protocol !== "https:" || !preview.hostname.endsWith(".netlify.app"))
  throw Error("Unexpected preview URL hostname");
const url = preview.href.replace(/\/$/, "");
console.log("JFS TEMPORARY isolated HTTPS preview: " + url + "/today/");
console.log("Anonymous Netlify deployments disappear after one hour if unclaimed.");
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    "\n### 臨時 HTTPS 預覽（非正式網站）\n\n" +
    "- [Today](" + url + "/today/)\n" +
    "- [Nutrition](" + url + "/nutrition/)\n" +
    "- [Training](" + url + "/training/)\n" +
    "- [Progress](" + url + "/progress/)\n\n" +
    "虛構資料，勿輸入個資。匿名預覽若未於一小時內認領即會移除；永久預覽請使用 Netlify Drop 驗收包。\n");
}
