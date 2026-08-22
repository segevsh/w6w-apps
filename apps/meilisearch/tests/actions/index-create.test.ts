import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-create.ts";

const conn = { display: { baseUrl: "https://search.example.com" } };

Deno.test("index-create: POSTs the uid and returns the task", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { taskUid: 1, status: "enqueued" } }], conn);
  const result = await action.execute!({ indexUid: "movies", primaryKey: "id" }, ctx) as {
    taskUid: number;
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://search.example.com/indexes");
  assertEquals(JSON.parse(calls[0].body!), { uid: "movies", primaryKey: "id" });
  assertEquals(result.taskUid, 1);
});

Deno.test("index-create: an unset primary key is omitted, not sent empty", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 202, body: {} }], conn);
  await action.execute!({ indexUid: "movies" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { uid: "movies" });
  assertEquals((logs[0].data as { explicitPrimaryKey: boolean }).explicitPrimaryKey, false);
});

/** Meilisearch's guess is permanent, so the hint has to say so. */
Deno.test("index-create: the primary key hint warns that the guess is permanent", () => {
  const param = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "primaryKey")!;
  assert(param.hint!.includes("GUESSES"), param.hint);
  assertEquals(action.idempotent, false);
});

Deno.test("index-create: a blank uid fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`indexUid`");
  assertEquals(calls.length, 0);
});
