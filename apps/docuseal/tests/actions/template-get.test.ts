import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-get.ts";

Deno.test("template-get: reads one template by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1, name: "Example" } }]);
  assertEquals(await action.execute!({ id: 1 }, ctx), { id: 1, name: "Example" });
  assertEquals(calls[0].url, "https://api.docuseal.com/templates/1");
  assertEquals(calls[0].method, "GET");
});

Deno.test("template-get: a missing id fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => action.execute!({}, ctx) as Promise<unknown>, Error, "id");
  assertEquals(calls.length, 0);
});
