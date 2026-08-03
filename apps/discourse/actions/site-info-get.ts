import type { ActionDefinition } from "@w6w/types";
import { DiscourseClient } from "../lib/client.ts";

/**
 * `GET /site.json` — the forum's own configuration payload.
 *
 * This is what Discourse's web client boots from, and it is the single most
 * useful lookup in the app: it carries `categories`, `groups`,
 * `archetypes`, `post_action_types`, `trust_levels`, `filters` and the
 * `notification_types` map — the enumerations that the rest of the API takes as
 * bare integers. If a workflow needs to know what `post_type: 4` means on a
 * post, the answer is in here.
 *
 * It is rendered through the request's `guardian`, so what comes back is scoped
 * to the connection's user: a key acting as an ordinary member sees fewer
 * categories than one acting as staff. That is correct behaviour, not a
 * truncated response.
 *
 * Note this is a **different endpoint** from `/site/basic-info.json`, which the
 * `site` health check uses. That one is deliberately tiny and exempt from the
 * login gate; this one is the full payload and is not.
 */
type Input = Record<string, never>;

const siteInfoGet: ActionDefinition<Input> = {
  key: "site-info-get",
  type: "read",
  resource: "site",
  title: "Get Site Info",
  description:
    "The forum's configuration payload — categories, groups, trust levels and the enum tables " +
    "the rest of the API returns as bare integers.",
  params: [],
  output: [
    { key: "default_archetype", type: "string", label: "Default archetype" },
    { key: "categories", type: "array", label: "Categories" },
    { key: "groups", type: "array", label: "Groups" },
    { key: "archetypes", type: "array", label: "Archetypes" },
    { key: "post_action_types", type: "array", label: "Post action types" },
    { key: "trust_levels", type: "object", label: "Trust levels" },
    { key: "notification_types", type: "object", label: "Notification types" },
    { key: "filters", type: "array", label: "Topic list filters" },
  ],

  execute(_input, ctx) {
    return new DiscourseClient(ctx).request("/site.json");
  },
};

export default siteInfoGet;
