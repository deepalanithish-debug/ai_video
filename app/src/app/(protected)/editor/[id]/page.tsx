import EditorShell from "@/components/editor2/EditorShell";
import { use } from "react";

export default function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <EditorShell projectId={id} />;
}
