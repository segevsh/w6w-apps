import { assertEquals } from "@std/assert";
import action from "../../actions/list-groups.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-groups: returns the array as items, group 0 included", async () => {
  const rows = [{ id: 0, name: "General" }, { id: 19, name: "Sport shoes" }];
  const { ctx, calls } = mockCtx([{ body: rows }]);
  const out = await action.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3.6/configuration/action/list_groups");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, { items: rows, count: 2 });
});

Deno.test("list-groups: extra fields are forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({ fields: ["routing_status"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { fields: ["routing_status"] });
});
