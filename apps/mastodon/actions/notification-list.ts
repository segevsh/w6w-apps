import type { ActionDefinition } from "@w6w/types";
import { csv, MastodonClient, query, stripHtml } from "../lib/client.ts";
import { limitParam, MAX_ID_PARAM, MIN_ID_PARAM } from "../lib/params.ts";

/**
 * `GET /api/v1/notifications` — mentions, follows, boosts and the rest.
 *
 * ## `type` is the discriminator, and two of them have no status
 *
 * `mention`, `status`, `reblog`, `follow`, `follow_request`, `favourite`,
 * `poll`, `update`. A `follow` and a `follow_request` carry an `account` and no
 * `status` at all, so code reading `notification.status.content` throws on the
 * most ordinary notification there is.
 *
 * ## There is no read/unread flag
 *
 * Unlike most notification APIs, Mastodon has no per-notification `read` field.
 * What it has is a **marker** — a single id per timeline recording how far you
 * have got — and the notifications above it are the new ones. So "what is new"
 * is a paging question, not a filtering one: keep the newest id seen and pass
 * it as `minId` next run.
 *
 * That also means nothing here can mark anything read, and this action does not
 * pretend to.
 */
const action: ActionDefinition = {
  key: "notification-list",
  type: "read",
  resource: "notification",
  title: "List notifications",
  description:
    "Mentions, follows, boosts and favourites. Mastodon has NO read flag — 'what is new' means " +
    "paging from the last id you saw, so nothing here marks anything read.",
  params: [
    {
      key: "types",
      label: "Only These Kinds",
      type: "string",
      default: "",
      hint: "Comma-separated: `mention`, `follow`, `follow_request`, `reblog`, `favourite`, " +
        "`poll`, `update`, `status`.",
    },
    {
      key: "excludeTypes",
      label: "Exclude These Kinds",
      type: "string",
      default: "",
      advanced: true,
      hint: "The same vocabulary. Excluding `favourite` and `reblog` is the usual way to get a " +
        "mentions-only feed.",
    },
    {
      key: "accountId",
      label: "From Account",
      type: "string",
      default: "",
      advanced: true,
    },
    limitParam(20),
    MAX_ID_PARAM,
    MIN_ID_PARAM,
  ],
  output: [
    { key: "notifications", type: "array", label: "Notifications, newest first" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "byType", type: "object", label: "A count per kind" },
    { key: "withoutStatus", type: "number", label: "How many carry no status — follows, mostly" },
    { key: "texts", type: "array", label: "The text of those that do have a status" },
    { key: "newestId", type: "string", label: "The high-water mark — store this" },
    { key: "nextMinId", type: "string", label: "Pass as Newer Than on the next run" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const page = await new MastodonClient(ctx).paged<
      Array<{ id?: string; type?: string; status?: { content?: string } }>
    >("/api/v1/notifications", {
      query: query({
        "types[]": csv(p.types)?.join(","),
        "exclude_types[]": csv(p.excludeTypes)?.join(","),
        account_id: p.accountId,
        limit: Math.min(40, Math.max(1, Number(p.limit ?? 20))),
        max_id: p.maxId,
        min_id: p.minId,
      }),
    });

    const notifications = page.items ?? [];
    const byType: Record<string, number> = {};
    for (const notification of notifications) {
      const type = String(notification?.type ?? "unknown");
      byType[type] = (byType[type] ?? 0) + 1;
    }

    // A follow has no status at all, which is what breaks a naive walk.
    const withStatus = notifications.filter((notification) => notification?.status);

    ctx.log("info", "read Mastodon notifications", {
      count: notifications.length,
      byType,
    });

    return {
      notifications,
      count: notifications.length,
      byType,
      withoutStatus: notifications.length - withStatus.length,
      texts: withStatus.map((notification) => stripHtml(notification.status?.content)),
      newestId: notifications[0]?.id,
      nextMinId: page.minId,
    };
  },
};

export default action;
