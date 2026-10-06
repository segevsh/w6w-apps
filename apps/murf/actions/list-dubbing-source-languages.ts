import type { ActionDefinition } from "@w6w/types";
import { MurfClient } from "../lib/client.ts";

const listDubbingSourceLanguages: ActionDefinition<Record<string, never>> = {
  key: "list-dubbing-source-languages",
  type: "read",
  resource: "language",
  title: "List Dubbing Source Languages",
  description:
    "List the languages Murf Dub can dub FROM (GET /v1/murfdub/list-source-languages). Needs the Murf Dub API key.",
  params: [],
  output: [
    { key: "languages", type: "array", label: "Languages (locale, language)" },
    { key: "count", type: "number", label: "Number of languages" },
  ],

  async execute(_input, ctx) {
    const languages = await new MurfClient(ctx).call<unknown[]>(
      "/v1/murfdub/list-source-languages",
    );
    if (!Array.isArray(languages)) {
      throw new Error("Murf returned an unexpected languages response");
    }
    return { languages, count: languages.length };
  },
};

export default listDubbingSourceLanguages;
