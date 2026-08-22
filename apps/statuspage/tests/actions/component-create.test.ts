import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/component-create.ts";

const conn = { display: { pageId: "pg1" } };

Deno.test("component-create: posts the component, shown by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "c1" } }], conn);
  await action.execute!({ name: "Search API", groupId: "g1" }, ctx);
  const sent = JSON.parse(calls[0].body!).component;
  assertEquals(sent.name, "Search API");
  assertEquals(sent.group_id, "g1");
  assertEquals(sent.showcase, true);
});

Deno.test("component-create: a missing name is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "name");
});

/** Without showcase the component is invisible however red it goes. */
Deno.test("component-create: warns that names are not unique and showcase matters", () => {
  assert(/not unique/.test(action.description!), action.description);
  assertEquals(action.idempotent, false);
});
