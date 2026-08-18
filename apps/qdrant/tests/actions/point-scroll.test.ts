import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/point-scroll.ts";

const page = (points: unknown[], next: string | number | null = null) =>
  ok({ points, next_page_offset: next });

Deno.test("point-scroll: walks the collection rather than searching it", async () => {
  const { ctx, calls } = mockCtx([page([{ id: 1 }, { id: 2 }], 3)], { display });
  const result = await action.execute!({ collection: "docs" }, ctx) as {
    count: number;
    nextOffset?: string | number;
    hasMore: boolean;
  };
  assertEquals(
    calls[0].url,
    "https://xyz.cloud.qdrant.io:6333/collections/docs/points/scroll",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.limit, 100);
  assertEquals(body.with_payload, true);
  assertEquals(result.count, 2);
  assertEquals(result.nextOffset, 3);
  assertEquals(result.hasMore, true);
});

/** `next_page_offset: null` is the end of the walk, not a missing field. */
Deno.test("point-scroll: a null cursor ends the walk", async () => {
  const { ctx } = mockCtx([page([{ id: 9 }], null)], { display });
  const result = await action.execute!({ collection: "docs" }, ctx) as {
    nextOffset?: string | number;
    hasMore: boolean;
  };
  assertEquals(result.nextOffset, undefined);
  assertEquals(result.hasMore, false);
});

/** The cursor is a real point id, so a numeric one has to go back as a number. */
Deno.test("point-scroll: a numeric cursor goes back as a number", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ collection: "docs", offset: "42" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).offset, 42);
});

Deno.test("point-scroll: a UUID cursor goes back as a string", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  const uuid = "0b3f9c66-2a5f-4f4a-9c2e-1a2b3c4d5e6f";
  await action.execute!({ collection: "docs", offset: uuid }, ctx);
  assertEquals(JSON.parse(calls[0].body!).offset, uuid);
});

Deno.test("point-scroll: an empty cursor is omitted, so the walk starts at the beginning", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ collection: "docs", offset: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).offset, undefined);
});

Deno.test("point-scroll: payloads can be turned off for a big export", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ collection: "docs", withPayload: false, withVector: true }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.with_payload, false);
  assertEquals(body.with_vector, true);
});

Deno.test("point-scroll: a filter scopes the export", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({
    collection: "docs",
    filter: '{"must":[{"key":"tenant","match":{"value":"acme"}}]}',
  }, ctx);
  assert(JSON.parse(calls[0].body!).filter, calls[0].body!);
});

Deno.test("point-scroll: logs a count, never the points", async () => {
  const { ctx, logs } = mockCtx([page([{ id: 1, payload: { secret: "tuna" } }])], { display });
  await action.execute!({ collection: "docs" }, ctx);
  assert(!JSON.stringify(logs).includes("tuna"), JSON.stringify(logs));
  assertEquals(logs[0].data, { collection: "docs", count: 1 });
});

Deno.test("point-scroll: needs a collection", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "collection");
  assertEquals(calls.length, 0);
});
