import type { ActionDefinition } from "@w6w/types";
import { DudaClient, seg } from "../lib/client.ts";

/**
 * `GET /api/sites/multiscreen/{siteName}/pages` — Pages v2 "List pages".
 *
 * Answers `ListResponseRDTPageV2Response`: `{ "results": [ PageV2Response, … ] }`.
 * Each page carries its `uuid` (the id every other page endpoint takes), its
 * `path` and `title`, its `type` (`REGULAR`, `DYNAMIC` or `BOOKING_WIDGET`),
 * a `draft_status`, the `collection_name` a dynamic page is bound to, and — only
 * on multilingual sites — the `lang` of that page.
 *
 * Pages **v1** is a different, separately documented surface
 * (`/api/sites/multiscreen/{siteName}/pages/v1`, with `pageId`-style ids); this
 * app covers v2 only, which is what a new integration should be built on.
 */
const listPages: ActionDefinition<{ siteName: string }> = {
  key: "list-pages",
  type: "read",
  resource: "page",
  title: "List Pages",
  description:
    "List a site's pages (Pages v2): path, title, type, draft status, and the collection a " +
    "dynamic page is bound to.",
  params: [
    {
      key: "siteName",
      label: "Site name",
      type: "string",
      required: true,
      hint: "Duda's site alias (`site_name`).",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Pages — `{ uuid, path, title, type, … }`" },
  ],

  execute(input, ctx) {
    return new DudaClient(ctx).request(`/api/sites/multiscreen/${seg(input.siteName)}/pages`);
  },
};

export default listPages;
