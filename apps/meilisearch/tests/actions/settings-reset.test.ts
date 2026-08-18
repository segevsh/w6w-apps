import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/settings-reset.ts";

const conn = { display: { baseUrl: "https://search.example.com", indexUid: "movies" } };

Deno.test("settings-reset: refuses to run without an explicit confirmation", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ indexUid: "movies" }, ctx),
    Error,
    "resets every setting, not one",
  );
  assertEquals(calls.length, 0);
});

Deno.test("settings-reset: with confirmation it DELETEs the settings, at warn", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 202, body: { taskUid: 6 } }], conn);
  await action.execute!({ indexUid: "movies", confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://search.example.com/indexes/movies/settings");
  assertEquals(logs[0].level, "warn");
});

Deno.test("settings-reset: never falls back to the connection's default index", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ confirm: true }, ctx),
    Error,
    "`indexUid` is required",
  );
  assertEquals(calls.length, 0);
  assert(action.description!.includes("EVERY setting"), action.description);
});
