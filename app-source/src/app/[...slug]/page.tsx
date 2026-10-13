import { FitnessApp } from "@/components/fitness-app";
import { LegacyRoute } from "@/components/legacy-route";
export const dynamicParams = false;
export function generateStaticParams() {
  return [
    "settings/general",
    "settings/companion",
    "settings/data-privacy",
    "knowledge",
    "knowledge/recovery-adaptation",
    "knowledge/exercise-recovery",
    "knowledge/muscle-fiber-types",
    "data",
    "training/plan/new",
    "training/plan/edit",
    "training/history/session",
    "progress/check-in",
    "progress/check-in/history",
    "progress/training/exercises",
    "nutrition/recipes/detail",
    "training/exercises/detail",
    "settings/profile",
    "settings/body",
    "settings/nutrition",
    "settings/training",
    "settings/recovery",
    "settings/notifications",
    "settings/account",
    "settings/accessibility",
    "settings/about",
    "nutrition/meals",
    "training/plan",
    "training/calendar",
    "training/history",
    "progress/review",
    "today",
    "onboarding",
    "login",
    "signup",
    "nutrition",
    "nutrition/plan",
    "nutrition/log",
    "nutrition/foods",
    "nutrition/recipes",
    "training",
    "training/cycle",
    "training/session",
    "training/templates",
    "training/exercises",
    "training/warmups",
    "training/activity",
    "progress",
    "progress/weekly",
    "progress/body",
    "progress/nutrition",
    "progress/training",
    "progress/recovery",
    "progress/history",
    "progress/recommendations",
    "learn",
    "learn/recovery-adaptation",
    "learn/exercise-recovery",
    "learn/muscle-fiber-types",
    "profile",
    "settings",
    "settings/appearance",
    "settings/privacy",
    "settings/data",
  ].map((p) => ({ slug: p.split("/") }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const aliases: Record<string, string> = {
    // Backward-compatible legacy entry points. New public paths render directly.
    "training/cycle": "training/plan",
    "training/templates": "training/plan",
    "progress/weekly": "progress/review",
    "progress/recommendations": "progress/review",
    login: "settings/account",
    signup: "settings/account",
    "nutrition/log": "nutrition",
  };
  const target = aliases[slug.join("/")];
  if (target) return <LegacyRoute target={"/" + target} />;
  const requested = slug.join("/");
  const resolved: Record<string, string> = {
    profile: "settings/profile",
    data: "settings/data",

    "training/plan/edit": "training/plan",
    "training/history/session": "training/history",
    "training/exercises/detail": "training/exercises",
    "nutrition/recipes/detail": "nutrition/recipes",
    "progress/check-in": "progress/review",
    "progress/check-in/history": "progress/history",
    "progress/training/exercises": "progress/training",
  };
  return <FitnessApp path={resolved[requested] ?? requested} />;
}
