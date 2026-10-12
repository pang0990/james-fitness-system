"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
export function LegacyRoute({target}:{target:string}) {
 const router=useRouter(); useEffect(()=>router.replace(target),[router,target]);
 return <main className="main"><p>頁面已移至新位置。</p><Link className="button" href={target}>前往新頁面</Link></main>;
}
