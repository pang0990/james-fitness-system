import { OfflineTrainingLab } from "@/components/offline-training-lab";

export default function OfflineTrainingDevelopmentPage() {
  if (process.env.NEXT_PUBLIC_JFS_OFFLINE_DEV_LAB !== "1") {
    return <main style={{padding:40}}>
      <h1>Offline Training development lab is disabled</h1>
      <p>This area is not part of the live Training 3.0 application.</p>
    </main>;
  }
  return <OfflineTrainingLab />;
}
