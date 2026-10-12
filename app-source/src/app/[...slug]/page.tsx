import { FitnessApp } from "@/components/fitness-app";
export const dynamicParams = false;
export function generateStaticParams() {
  return [
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
  return <FitnessApp path={slug.join("/")} />;
}
