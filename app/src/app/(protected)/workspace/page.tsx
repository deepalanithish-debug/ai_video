import { Suspense } from "react";
import AIWorkspace from "@/components/workspace/AIWorkspace";

export const metadata = { title: "AI Workspace — VydeoAI" };

export default function WorkspacePage() {
  return (
    <Suspense fallback={null}>
      <AIWorkspace />
    </Suspense>
  );
}
