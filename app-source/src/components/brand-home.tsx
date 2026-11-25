"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowRight, Dumbbell, Utensils } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { appHref } from "@/lib/supabase-browser";

const mediaPath = (name: string) =>
  (process.env.NEXT_PUBLIC_BASE_PATH || "") + "/brand/" + name;

function useEditorialReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const sections = [...document.querySelectorAll<HTMLElement>(".brand-reveal")];
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }),
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    sections.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
}

export function BrandHome() {
  const { user, ready, error, signInGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  useEditorialReveal();
  const signedIn = Boolean(user);

  async function enter() {
    if (signedIn) {
      window.location.assign(appHref("today"));
      return;
    }
    setBusy(true);
    try {
      await signInGoogle();
    } finally {
      setBusy(false);
    }
  }

  const buttonLabel = signedIn ? "Enter the app" : busy ? "Connecting…" : "Enter James";

  return (
    <div className="jfs-brand">
      <header className="brand-header">
        <a href={appHref("")} className="brand-wordmark" aria-label="JAMES，回到首頁">JAMES</a>
        <nav aria-label="品牌導覽">
          <a href="#method">Method</a>
          <a href="#product">Product</a>
          <a href="#journal">Journal</a>
        </nav>
        <button className="brand-button brand-button-small" disabled={!ready || busy} onClick={() => void enter()}>
          {signedIn ? "Open app" : "Sign in"}
        </button>
      </header>

      <main>
        <section className="brand-hero" aria-labelledby="brand-hero-title">
          <div className="brand-hero-copy">
            <h1 id="brand-hero-title">Progress, with <em>intention.</em></h1>
            <p>Training, nutrition and recovery — finally in one thoughtful place.</p>
            <div className="brand-hero-actions">
              <button className="brand-button" disabled={!ready || busy} onClick={() => void enter()}>
                {buttonLabel}<ArrowRight size={19} aria-hidden="true"/>
              </button>
              <a href="#product" className="brand-text-link">Explore the system</a>
            </div>
            {error && <p className="brand-auth-error" role="alert">{error}</p>}
          </div>

          <div className="brand-product-frame" id="product" aria-label="James Fitness System 介面預覽">
            <div className="brand-product-top"><span>JAMES</span><span>Today · Health in focus</span></div>
            <div className="brand-product-content">
              <div className="brand-product-rail" aria-hidden="true">
                <span className="is-current">Today</span><span>Journal</span><span>Training</span>
              </div>
              <div className="brand-product-data">
                <p className="brand-product-date">YOUR EVERYDAY SYSTEM</p>
                <h2>Make each day count.</h2>
                <div className="brand-product-focus"><span>Today’s focus</span><strong>Move with purpose.</strong><small>Your next meaningful step, clearly in view.</small></div>
                <div className="brand-product-metrics">
                  <div><Utensils size={19}/><span>Nutrition</span><strong>Stay nourished</strong><i/></div>
                  <div><Dumbbell size={19}/><span>Training</span><strong>Build consistency</strong><i/></div>
                  <div><Activity size={19}/><span>Insights</span><strong>See the pattern</strong><i/></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="method" className="brand-story brand-reveal" aria-labelledby="brand-method-title">
          <div className="brand-story-image"><img src={mediaPath("studio-athlete.webp")} alt="運動後在自然日光中休息的女性" loading="lazy"/></div>
          <div className="brand-story-copy">
            <h2 id="brand-method-title">Your health, <em>in focus.</em></h2>
            <span className="brand-accent-rule" aria-hidden="true"/>
            <p>A unified view of your training, nutrition and recovery, so you can make better decisions, stay consistent, and build lasting progress.</p>
            <div className="brand-story-line" aria-hidden="true">
              <svg viewBox="0 0 480 140" role="presentation" preserveAspectRatio="none"><path d="M0 122 C55 96 85 70 123 83 S198 35 243 52 S322 81 365 42 S435 51 480 12"/><path className="brand-story-area" d="M0 122 C55 96 85 70 123 83 S198 35 243 52 S322 81 365 42 S435 51 480 12 L480 140 L0 140 Z"/></svg>
            </div>
            <div className="brand-legend"><span>Training</span><span>Nutrition</span><span>Recovery</span></div>
          </div>
        </section>

        <section id="journal" className="brand-story brand-story-features brand-reveal" aria-labelledby="brand-features-title">
          <div className="brand-story-image"><img src={mediaPath("trail-runner.webp")} alt="在清晨山徑上慢跑的運動者" loading="lazy"/></div>
          <div className="brand-story-copy">
            <h2 id="brand-features-title">A clearer way to <em>move forward.</em></h2>
            <div className="brand-feature-list">
              <div><Dumbbell aria-hidden="true"/><div><h3>Train with purpose</h3><p>Evidence-informed programming that fits your life and builds lasting capacity.</p></div></div>
              <div><Utensils aria-hidden="true"/><div><h3>Eat with clarity</h3><p>A practical, sustainable approach to nutrition that supports your long-term health.</p></div></div>
              <div><Activity aria-hidden="true"/><div><h3>Understand your progress</h3><p>Connect the dots across training, nutrition and recovery to see what matters.</p></div></div>
            </div>
            <button className="brand-button brand-button-wide" disabled={!ready || busy} onClick={() => void enter()}>
              {signedIn ? "Continue to James" : "Continue with Google"}<ArrowRight size={20} aria-hidden="true"/>
            </button>
          </div>
        </section>
      </main>

      <footer className="brand-footer"><span>JAMES FITNESS SYSTEM</span><span>Training · Nutrition · Recovery</span></footer>
    </div>
  );
}
