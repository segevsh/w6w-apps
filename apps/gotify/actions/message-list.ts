import type { ActionDefinition } from "@w6w/types";
import { GotifyClient, num } from "../lib/client.ts";
import { APPLICATION_ID_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /message` or, when `applicationId` is set, `GET /application/{id}/message`
 * — verified against Gotify's OpenAPI document (`getMessages`,
 * `getAppMessages`), which share an identical `PagedMessages` response shape
 * and `limit`/`since` query parameters.
 *
 * **The response is a page, not a bare array.** `paging.since` is the id to
 * pass back as `since` to fetch the next page, and `paging.next` (a full
 * relative path Gotify would follow itself) is empty once there is nothing
 * left — both are handed back rather than only the messages, since a caller
 * paging through a large history needs them.
 */
const action: ActionDefinition = {
  key: "message-list",
  type: "read",
  resource: "message",
  title: "List messages",
  description: "List messages, optionally scoped to one application.",
  params: [
    { ...APPLICATION_ID_PARAM, hint: "Blank lists every message on the connection's account." },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "messages", type: "array", label: "Messages" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const applicationId = num(p.applicationId);
    const path = applicationId
      ? `/application/${encodeURIComponent(String(applicationId))}/message`
      : "/message";

    ctx.log("info", "listing Gotify messages", { applicationId });

    return await new GotifyClient(ctx).request(path, {
      query: { limit: num(p.limit), since: num(p.since) },
    });
  },
};

export default action;
