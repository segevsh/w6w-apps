import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-get.ts";

const conn = { display: { baseUrl: "https://search.example.com", indexUid: "movies" } };

Deno.test("index-get: reads one index and its primary key", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { uid: "movies", primaryKey: "id" } }],
    conn,
  );
  const result = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://search.example.com/indexes/movies");
  assertEquals(result.primaryKey, "id");
});

/** null until the first documents arrive, then fixed. */
Deno.test("index-get: the output says when the primary key is null", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "primaryKey")!.label.includes("null until"));
});

Deno.test("index-get: with no index anywhere it says so before calling", async () => {
  const { ctx, calls } = mockCtx([], { display: { baseUrl: "https://x.com" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "no index");
  assertEquals(calls.length, 0);
});
