import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/stream-properties-get.ts";

const D = { display: { host: "https://api.airbyte.com" } };
const SOURCE = "e735894a-e773-4938-969f-45f53957b75b";
const DEST = "18dccc91-0ab1-4f72-9ed7-0b8fc27c5826";
const streams = {
  status: 200,
  body: [
    {
      streamName: "orders",
      syncModes: ["full_refresh", "incremental_append", "incremental_deduped_history"],
      defaultCursorField: ["updated_at"],
      sourceDefinedCursorField: true,
      sourceDefinedPrimaryKey: [["id"]],
      propertyFields: [["id"], ["total"]],
    },
    {
      streamName: "products",
      syncModes: ["full_refresh", "incremental_append"],
      defaultCursorField: [],
      sourceDefinedCursorField: false,
    },
    { streamName: "settings", syncModes: ["full_refresh"] },
  ],
};

/** Whether a stream can go incremental is a fact about the connector. */
Deno.test("stream-properties-get: separates incremental-capable from full-refresh-only", async () => {
  const { ctx, calls } = mockCtx([streams], D);
  const result = await action.execute({ sourceId: SOURCE, destinationId: DEST }, ctx) as Record<
    string,
    unknown
  >;
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/v1/streams");
  assertEquals(q.get("sourceId"), SOURCE);
  assertEquals(q.get("destinationId"), DEST);
  assertEquals(result.incrementalCapable, ["orders", "products"]);
  assertEquals(result.fullRefreshOnly, ["settings"]);
});

/** A cursor the connector does not define is a choice somebody makes badly. */
Deno.test("stream-properties-get: names the streams needing a cursor chosen", async () => {
  const { ctx, logs } = mockCtx([streams], D);
  const result = await action.execute({ sourceId: SOURCE }, ctx) as Record<string, unknown>;
  assertEquals(result.sourceDefinedCursors, ["orders"]);
  assertEquals(result.needsCursorChoice, ["products"]);
  assert(
    logs.some((l) => /loses rows without any error/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("stream-properties-get: the destination is optional", async () => {
  const { ctx, calls } = mockCtx([streams], D);
  await action.execute({ sourceId: SOURCE }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("destinationId"), null);
});

Deno.test("stream-properties-get: both ids must be UUIDs", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ sourceId: "nope" }, ctx),
    Error,
    "must be a UUID",
  );
  await assertRejects(
    async () => await action.execute({ sourceId: SOURCE, destinationId: "nope" }, ctx),
    Error,
    "must be a UUID",
  );
  assertEquals(calls.length, 0);
});
