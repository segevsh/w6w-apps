import type { HookContext, Option, ResolveFieldsHook } from "@w6w/types";
import { AnthropicClient } from "./client.ts";

const MAX_OPTIONS = 1000;

interface ModelsPage {
  data?: Array<{ id: string; display_name?: string; created_at?: string }>;
  has_more?: boolean;
  last_id?: string;
}

async function listModelOptions(ctx: HookContext): Promise<Option[]> {
  const client = new AnthropicClient(ctx);
  const models: NonNullable<ModelsPage["data"]> = [];
  let afterId: string | undefined;
  while (models.length < MAX_OPTIONS) {
    const page = await client.request<ModelsPage>("/v1/models", {
      query: { limit: 1000, after_id: afterId },
    });
    models.push(...(page.data ?? []));
    if (!page.has_more || !page.last_id) break;
    afterId = page.last_id;
  }
  return models
    .slice(0, MAX_OPTIONS)
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
    .map((m) => {
      const option: Option = { value: m.id, label: m.display_name || m.id };
      if (m.created_at) option.description = m.created_at;
      return option;
    });
}

/** Live `model` picker for message-create / count-tokens (GET /v1/models). */
export const resolveAnthropicFields: ResolveFieldsHook = async (input, ctx) => {
  const fields: Record<string, { options: Option[] }> = {};
  if (input.fields.includes("model")) fields.model = { options: await listModelOptions(ctx) };
  return { fields };
};
