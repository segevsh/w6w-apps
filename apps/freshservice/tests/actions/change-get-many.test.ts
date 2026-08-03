import { assertEquals, assertRejects } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/change-get-many.ts";

Deno.test("change-get-many: GETs /changes and unwraps `changes`", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { changes: [{ id: 1 }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/changes");
  assertEquals(out, { changes: [{ id: 1 }] });
});

Deno.test("change-get-many: sends the query filter", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { changes: [] } }]);
  await action.execute({ query: "priority:4 OR priority:3" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("query"), "priority:4 OR priority:3");
});

Deno.test("change-get-many: refuses query+view locally rather than eating a 400", async () => {
  const { ctx, calls } = mockFreshserviceCtx();
  await assertRejects(
    () => action.execute({ query: "priority:4", view: "my_open" }, ctx) as Promise<unknown>,
    Error,
    "not both",
  );
  assertEquals(calls.length, 0);
});
