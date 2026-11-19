"use client";

import { REVIEW_PREVIEW, REVIEW_STORAGE_KEY } from "@/lib/review-preview";
import { appHref } from "@/lib/supabase-browser";

/** Always visible on builds containing generated sample-data access. */
export function ReviewPreviewBanner() {
  if (!REVIEW_PREVIEW) return null;
  return (
    <aside data-testid="jfs-review-banner" aria-label="獨立測試預覽環境"
      style={{
        position:"sticky",top:0,zIndex:9999,padding:"9px 14px",
        color:"#14382f",background:"#e6f1eb",
        display:"flex",alignItems:"center",justifyContent:"center",
        gap:12,flexWrap:"wrap",fontSize:12,lineHeight:1.5,
        borderBottom:"1px solid #cddad4",
      }}>
      <strong>JFS · TEST PREVIEW</strong>
      <span>隔離預覽・虛構資料・僅存本機</span>
      <button type="button" aria-label="還原虛構測試資料"
        style={{border:"1px solid #87a59a",borderRadius:8,color:"#14382f",
          background:"transparent",padding:"4px 9px",cursor:"pointer"}}
        onClick={()=>{
          if(!window.confirm("還原測試資料？會刪除這個預覽版的本機操作紀錄，不影響正式網站。"))return;
          window.localStorage.removeItem(REVIEW_STORAGE_KEY);
          window.location.assign(appHref("today"));
        }}>
        重設示範資料
      </button>
    </aside>
  );
}
