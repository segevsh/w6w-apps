import type { ActionDefinition } from "@w6w/types";
import { listResult, SynthflowClient } from "../lib/client.ts";
import { limitParam, offsetParam, workspaceParam } from "../lib/params.ts";

interface Input {
  workspace: string;
  limit?: number;
  offset?: number;
  search?: string;
  provider?: string;
}

const voiceList: ActionDefinition<Input> = {
  key: "voice-list",
  type: "search",
  resource: "voice",
  title: "List Voices",
  description: "Browse the voices available to agents.",
  params: [
    workspaceParam,
    limitParam,
    offsetParam,
    { key: "search", label: "Search", type: "string", hint: "Search voices by name." },
    {
      key: "provider",
      label: "Provider",
      type: "string",
      hint: "Voice provider to filter by. Synthflow's default is elevenlabs.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Voices" }, {
    key: "pagination",
    type: "object",
    label: "Pagination",
  }],

  async execute(input, ctx) {
    const r = await new SynthflowClient(ctx).data<Record<string, unknown>>("/voices", {
      query: {
        workspace: input.workspace,
        limit: input.limit,
        offset: input.offset,
        search: input.search,
        provider: input.provider,
      },
    });
    return listResult(r, "voices");
  },
};

export default voiceList;
