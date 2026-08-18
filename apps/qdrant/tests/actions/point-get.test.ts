import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/point-get.ts";

/** Asking for five and getting three back is a successful response. */
Deno.test("point-get: works out which ids did not come back", async () => {
  const { ctx, calls } = mockCtx([ok([{ id: 1 }, { id: 3 }])], { display });
  const result = await action.execute!({ collection: "docs", ids: "1,2,3" }, ctx) as {
    count: number;
    missing: Array<string | number>;
  };
  assertEquals(calls[0].url, "https://xyz.cloud.qdrant.io:6333/collections/docs/points");
  assertEquals(JSON.parse(calls[0].body!).ids, [1, 2, 3]);
  assertEquals(result.count, 2);
  assertEquals(result.missing, [2]);
});

Deno.test("point-get: a JSON array of ids works too", async () => {
  const { ctx, calls } = mockCtx([ok([])], { display });
  await action.execute!({ collection: "docs", ids: "[10, 11]" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).ids, [10, 11]);
});

/** Unlike point-query, payloads are on by Qdrant's own default here. */
Deno.test("point-get: asks for payloads and not vectors", async () => {
  const { ctx, calls } = mockCtx([ok([])], { display });
  await action.execute!({ collection: "docs", ids: "1" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.with_payload, true);
  assertEquals(body.with_vector, false);
});

Deno.test("point-get: an unusable id is refused before the request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ collection: "docs", ids: "https://example.com/a" }, ctx),
    Error,
    "hash it into a UUID",
  );
  assertEquals(calls.length, 0);
});

Deno.test("point-get: needs a collection and ids", async () => {
  const noCollection = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ ids: "1" }, noCollection.ctx),
    Error,
    "collection",
  );
  const noIds = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ collection: "docs" }, noIds.ctx),
    Error,
    "ids",
  );
});

Deno.test("point-get: logs counts only", async () => {
  const { ctx, logs } = mockCtx([ok([{ id: 1, payload: { secret: "tuna" } }])], { display });
  await action.execute!({ collection: "docs", ids: "1,2" }, ctx);
  assert(!JSON.stringify(logs).includes("tuna"), JSON.stringify(logs));
  assertEquals(logs[0].data, { collection: "docs", count: 1, missing: 1 });
});
