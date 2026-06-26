import { Suspense, use } from "react";
import AIWorkspace from "@/components/workspace/AIWorkspace";

export const metadata = { title: "AI Workspace — VydeoAI" };

export default function WorkspaceProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <AIWorkspace projectId={id} />
    </Suspense>
  );
}
