import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/documents-clear.ts";

const conn = { display: { baseUrl: "https://search.example.com", indexUid: "movies" } };

Deno.test("documents-clear: refuses to run without an explicit confirmation", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ indexUid: "movies" }, ctx),
    Error,
    "`confirm` must be true",
  );
  assertEquals(calls.length, 0);
});

Deno.test("documents-clear: with confirmation it DELETEs the collection, at warn", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200, body: { taskUid: 7 } }], conn);
  await action.execute!({ indexUid: "movies", confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://search.example.com/indexes/movies/documents");
  assertEquals(logs[0].level, "warn");
});

/** A blank field must not resolve to the connection's index and empty it. */
Deno.test("documents-clear: never falls back to the connection's default index", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ confirm: true }, ctx),
    Error,
    "`indexUid` is required",
  );
  assertEquals(calls.length, 0);
  assert(action.description!.includes("index and settings remain"), action.description);
});
