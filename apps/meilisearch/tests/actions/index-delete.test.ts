import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/index-delete.ts";

const conn = { display: { baseUrl: "https://search.example.com", indexUid: "movies" } };

Deno.test("index-delete: refuses to run without an explicit confirmation", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ indexUid: "movies" }, ctx),
    Error,
    "takes its settings too",
  );
  assertEquals(calls.length, 0);
});

Deno.test("index-delete: with confirmation it DELETEs the index, at warn", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 202, body: { taskUid: 3 } }], conn);
  await action.execute!({ indexUid: "movies", confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://search.example.com/indexes/movies");
  assertEquals(logs[0].level, "warn");
});

Deno.test("index-delete: never falls back to the connection's default index", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ confirm: true }, ctx),
    Error,
    "`indexUid` is required",
  );
  assertEquals(calls.length, 0);
  assert(action.description!.includes("all of its settings"), action.description);
});
