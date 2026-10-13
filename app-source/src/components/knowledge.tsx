"use client";
import Link from "next/link";
import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ChevronRight, BookOpen } from "lucide-react";
import articles from "@/content/articles.json";
import { PageTitle, Field } from "./daily";
export function Knowledge({ path }: { path: string }) {
  const [search, setSearch] = useState("");
  const article = articles.find((a) => path === "learn/" + a.slug);
  return (
    <div className="daily-page knowledge">
      {article ? (
        <>
          <Link className="text-link" href="/knowledge">
            <ArrowLeft size={18} />
            Knowledge
          </Link>
          <PageTitle title={article.title} />
          <p className="article-meta">
            {article.category} · 約 {Math.ceil(article.body.length / 600)} 分鐘
          </p>
          <article className="article-body">
            <Markdown remarkPlugins={[remarkGfm]}>
              {article.body.replace(/^# .+\n/, "")}
            </Markdown>
          </article>
          <details className="source-details">
            <summary>文章來源</summary>
            <p>
              {article.sourceConversation} · 內容版本 {article.version}
            </p>
            <p>{article.referenceNote}</p>
          </details>
        </>
      ) : (
        <>
          <PageTitle title="Knowledge" />
          <Field label="搜尋文章">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="主題或關鍵字"
            />
          </Field>
          <div className="article-list">
            {articles
              .filter((a) =>
                (a.title + a.body).toLowerCase().includes(search.toLowerCase()),
              )
              .map((a) => (
                <Link href={"/knowledge/" + a.slug} key={a.id}>
                  <BookOpen size={24} />
                  <div>
                    <small>{a.category}</small>
                    <h2>{a.title}</h2>
                    <span>約 {Math.ceil(a.body.length / 600)} 分鐘</span>
                  </div>
                  <ChevronRight />
                </Link>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
