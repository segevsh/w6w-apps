import type { ActionDefinition } from "@w6w/types";
import { OnePasswordClient } from "../lib/client.ts";
import {
  CURSOR_PARAM,
  END_TIME_PARAM,
  eventsBody,
  LIMIT_PARAM,
  START_TIME_PARAM,
} from "../lib/events.ts";

/**
 * `POST /api/v2/itemusages` — who opened which secret.
 *
 * ## The most useful endpoint 1Password has, for this purpose
 *
 * Every read of an item is recorded: which item, in which vault, by which
 * account, from which client and IP, at what time. That makes several questions
 * answerable that are otherwise guesswork:
 *
 * - A credential leaked. **Who had access to it, and who actually opened it?**
 * - A person left. **What did they read in their last month?**
 * - A vault is being tidied. **Which items has nobody opened in a year?**
 * - An integration is being audited. **Is that Connect token reading only what
 *   it should?**
 *
 * The last one is worth dwelling on: reads made *through Connect* appear here
 * too, so this is how an automated secret consumer is held to account. An app
 * that reads secrets ought to ship the means of auditing itself.
 *
 * ## The record is of the read, not of a use
 *
 * An item being opened is not the same as the credential being used — somebody
 * may have looked at the wrong entry and closed it. The reverse also holds: a
 * secret cached in a client is used without ever being read again. This is
 * evidence, not proof.
 *
 * ## `used_version` catches the stale copy
 *
 * It records which version of the item was read. A read of an old version after
 * a rotation means somebody has a stale credential, and that is usually the
 * thing worth knowing.
 */
const action: ActionDefinition = {
  key: "item-usage-list",
  type: "read",
  resource: "event",
  title: "List item usages",
  description:
    "Who opened which secret, when, and from where — including reads made through Connect, so " +
    "this is how an automated consumer of secrets is audited.",
  params: [START_TIME_PARAM, END_TIME_PARAM, LIMIT_PARAM, CURSOR_PARAM],
  output: [
    { key: "usages", type: "array", label: "Item read events" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "cursor", type: "string", label: "Pass back for the next page" },
    { key: "hasMore", type: "boolean", label: "Whether to keep going" },
    { key: "uniqueItems", type: "number", label: "Distinct items read in this page" },
    { key: "uniqueActors", type: "number", label: "Distinct accounts doing the reading" },
  ],

  async execute(input, ctx) {
    const client = new OnePasswordClient(ctx);
    const host = client.requireEvents("item-usage-list");
    const p = input as Record<string, unknown>;

    const result = await client.request<{
      items?: Array<{
        item_uuid?: string;
        vault_uuid?: string;
        user?: { uuid?: string };
        used_version?: number;
      }>;
      cursor?: string;
      has_more?: boolean;
    }>(host, "/api/v2/itemusages", {
      method: "POST",
      body: eventsBody(
        String(p.cursor ?? "").trim(),
        Number(p.limit ?? 100),
        String(p.startTime ?? "").trim(),
        String(p.endTime ?? "").trim(),
      ),
    });

    const usages = result?.items ?? [];
    // Counts of distinct uuids — never the uuids themselves, which identify
    // both a person and the secret they opened.
    const items = new Set(usages.map((usage) => usage?.item_uuid).filter(Boolean));
    const actors = new Set(usages.map((usage) => usage?.user?.uuid).filter(Boolean));

    ctx.log("info", "read 1Password item usages", {
      count: usages.length,
      uniqueItems: items.size,
    });

    return {
      usages,
      count: usages.length,
      cursor: result?.cursor,
      hasMore: result?.has_more === true,
      uniqueItems: items.size,
      uniqueActors: actors.size,
    };
  },
};

export default action;
