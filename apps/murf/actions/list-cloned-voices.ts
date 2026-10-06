import type { ActionDefinition } from "@w6w/types";
import { MurfClient } from "../lib/client.ts";

const listClonedVoices: ActionDefinition<Record<string, never>> = {
  key: "list-cloned-voices",
  type: "read",
  resource: "voice",
  title: "List Cloned Voices",
  description:
    "List the synthesis-ready cloned voices in the workspace (GET /v1/speech/voices/cloned). Per Murf, cloned voices work with Falcon streaming only, not Synthesize Speech.",
  params: [],
  output: [
    { key: "voices", type: "array", label: "Cloned voices (voiceId, displayName, tag, createdAt)" },
    { key: "count", type: "number", label: "Number of cloned voices" },
  ],

  async execute(_input, ctx) {
    const voices = await new MurfClient(ctx).call<unknown[]>("/v1/speech/voices/cloned");
    if (!Array.isArray(voices)) {
      throw new Error("Murf returned an unexpected cloned-voices response");
    }
    return { voices, count: voices.length };
  },
};

export default listClonedVoices;
