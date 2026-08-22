import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/work-item-get.ts";

const item = one({
  id: 101,
  fields: {
    "System.Title": "Fix login",
    "System.State": "Active",
    "System.WorkItemType": "Bug",
    "Custom.TeamArea": "Platform",
  },
});

/** Values live under namespaced keys — there is no `title`. */
Deno.test("work-item-get: returns the raw fields and a flattened view", async () => {
  const { ctx, calls } = mockCtx([item], { display });
  const result = await action.execute!({ project: "P", workItemId: "101" }, ctx) as {
    fields: Record<string, unknown>;
    flat: Record<string, unknown>;
  };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://dev.azure.com/contoso/P/_apis/wit/workitems/101",
  );
  assertEquals(result.flat.title, "Fix login");
  assertEquals(result.flat.state, "Active");
  // The raw object survives, so a custom field is not lost.
  assertEquals(result.fields["Custom.TeamArea"], "Platform");
});

Deno.test("work-item-get: short field names are qualified before being sent", async () => {
  const { ctx, calls } = mockCtx([item], { display });
  await action.execute!({ project: "P", workItemId: "101", fields: "title, state" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("fields"),
    "System.Title,System.State",
  );
});

/** Azure DevOps rejects `fields` and `$expand` together. */
Deno.test("work-item-get: asking for relations drops the field list", async () => {
  const { ctx, calls } = mockCtx([item], { display });
  await action.execute!({
    project: "P",
    workItemId: "101",
    fields: "title",
    expandRelations: true,
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("$expand"), "relations");
  assertEquals(q.get("fields"), null);
});

Deno.test("work-item-get: needs a project and an id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ project: "P" }, ctx),
    Error,
    "workItemId",
  );
  assertEquals(calls.length, 0);
});

Deno.test("work-item-get: says fields are namespaced", () => {
  assert(/`System.Title`, not `title`/.test(action.description!), action.description);
});
