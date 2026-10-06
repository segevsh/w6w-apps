import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

interface Input {
  url: string;
  useCache?: string;
  liveFetch?: string;
}

/** `GET /school` */
const schoolProfileGet: ActionDefinition<Input> = {
  key: "school-profile-get",
  type: "read",
  resource: "school",
  title: "Get School Profile",
  description: "Return the structured profile of a school from its profile URL (1 credit).",
  params: [
    { key: "url", label: "School profile URL", type: "string", required: true },
    {
      key: "useCache",
      label: "Cache freshness",
      type: "select",
      hint:
        "if-present reads the cache whatever its age; if-recent makes a best effort at a profile no older than 29 days and costs 1 extra credit. Omit for the vendor default.",
      options: [{ value: "if-present", label: "if-present" }, {
        value: "if-recent",
        label: "if-recent",
      }],
    },
    {
      key: "liveFetch",
      label: "Live fetch",
      type: "select",
      hint: "force always fetches a fresh profile and costs 9 extra credits.",
      options: [{ value: "default", label: "default" }, { value: "force", label: "force" }],
    },
  ],
  output: [
    { key: "profile", type: "object", label: "School profile (the full response body)" },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/school", {
      url: input.url,
      use_cache: input.useCache,
      live_fetch: input.liveFetch,
    });
    return {
      profile: res,
    };
  },
};

export default schoolProfileGet;
