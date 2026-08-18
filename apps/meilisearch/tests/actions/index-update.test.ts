import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-update.ts";

const conn = { display: { baseUrl: "https://search.example.com", indexUid: "movies" } };

Deno.test("index-update: PATCHes the primary key", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { taskUid: 4 } }], conn);
  await action.execute!({ primaryKey: "movieId" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://search.example.com/indexes/movies");
  assertEquals(JSON.parse(calls[0].body!), { primaryKey: "movieId" });
});

/** The task fails on a non-empty index; the call itself still looks fine. */
Deno.test("index-update: the hint points at Get Task for the real outcome", () => {
  const param = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "primaryKey")!;
  assert(param.hint!.includes("Get Task"), param.hint);
});

Deno.test("index-update: a blank primary key fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`primaryKey`");
  assertEquals(calls.length, 0);
});
