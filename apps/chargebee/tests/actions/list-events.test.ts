import { assertEquals } from "@std/assert";
import { connected, mockCtx, optionValues, param } from "../_helpers.ts";
import action from "../../actions/list-events.ts";

const ok = { status: 200, body: { list: [] } };

Deno.test("list-events: is a search action over the event resource", () => {
  assertEquals(action.key, "list-events");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "event");
});

Deno.test("list-events: GETs /events", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({}, connected(ctx));
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/events");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("list-events: sends the filters in operator form", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({
    eventType: "subscription_created",
    webhookStatus: "failed",
    source: "api",
  }, connected(ctx));
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("event_type[is]"), "subscription_created");
  assertEquals(q.get("webhook_status[is]"), "failed");
  assertEquals(q.get("source[is]"), "api");
});

Deno.test("list-events: occurred_at takes one bound or a `between` range", async () => {
  const a = mockCtx([ok]);
  await action.execute({ occurredAfter: 1435054328 }, connected(a.ctx));
  assertEquals(new URL(a.calls[0].url).searchParams.get("occurred_at[after]"), "1435054328");

  const b = mockCtx([ok]);
  await action.execute({ occurredAfter: 1435054328, occurredBefore: 1435154328 }, connected(b.ctx));
  assertEquals(
    new URL(b.calls[0].url).searchParams.get("occurred_at[between]"),
    "[1435054328,1435154328]",
  );
});

Deno.test("list-events: sort_by is hard-coded to occurred_at — the only value it accepts", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ sortOrder: "desc" }, connected(ctx));
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("sort_by[desc]"), "occurred_at");
  // No sort attribute param exists, because there is no choice to offer.
  assertEquals((action.params ?? []).some((p) => p.key === "sortAttribute"), false);
});

Deno.test("list-events: no sort order means no sort_by, leaving Chargebee's own ordering", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({}, connected(ctx));
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(param(action, "sortOrder").default, undefined);
});

Deno.test("list-events: eventType is free text — Chargebee documents 200-plus values", () => {
  const p = param(action, "eventType");
  assertEquals(p.type, "string");
  assertEquals(p.options, undefined);
});

Deno.test("list-events: offers the documented webhook statuses and sources", () => {
  assertEquals(optionValues(action, "webhookStatus"), [
    "not_configured",
    "scheduled",
    "succeeded",
    "re_scheduled",
    "failed",
    "skipped",
    "not_applicable",
    "disabled",
    "rate_limited",
  ]);
  assertEquals(optionValues(action, "source").includes("api"), true);
  assertEquals(optionValues(action, "source").includes("scheduled_job"), true);
});
