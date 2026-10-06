import type { ActionDefinition } from "@w6w/types";
import { MurfClient } from "../lib/client.ts";

const listDubbingDestinationLanguages: ActionDefinition<Record<string, never>> = {
  key: "list-dubbing-destination-languages",
  type: "read",
  resource: "language",
  title: "List Dubbing Destination Languages",
  description:
    "List the languages Murf Dub can dub INTO (GET /v1/murfdub/list-destination-languages), with the dubbing types (AUTOMATED, QA) each supports. Needs the Murf Dub API key.",
  params: [],
  output: [
    { key: "languages", type: "array", label: "Languages (locale, language, supports)" },
    { key: "count", type: "number", label: "Number of languages" },
  ],

  async execute(_input, ctx) {
    const languages = await new MurfClient(ctx).call<unknown[]>(
      "/v1/murfdub/list-destination-languages",
    );
    if (!Array.isArray(languages)) {
      throw new Error("Murf returned an unexpected languages response");
    }
    return { languages, count: languages.length };
  },
};

export default listDubbingDestinationLanguages;
