import type { ActionDefinition } from "@w6w/types";
import { asArray, SynthflowClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const knowledgeBaseGet: ActionDefinition<Input> = {
  key: "knowledge-base-get",
  type: "read",
  resource: "knowledge-base",
  title: "Get Knowledge Base",
  description: "Read one knowledge base by id.",
  params: [
    { key: "id", label: "Knowledge base ID", type: "string", required: true },
  ],
  output: [{ key: "knowledge_base", type: "object", label: "Knowledge base" }],

  async execute(input, ctx) {
    const r = await new SynthflowClient(ctx).data<Record<string, unknown>>(
      `/knowledge_base/${encodeURIComponent(input.id)}`,
    );
    return { knowledge_base: asArray(r.knowledge_bases)[0] ?? null };
  },
};

export default knowledgeBaseGet;
