import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-add-leads.ts";

const leads = [{ profileUrl: "https://www.linkedin.com/in/john-doe/", firstName: "John" }];

Deno.test("list-add-leads: POSTs the list id and the lead objects", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { addedLeadsCount: 1 } }]);
  await action.execute!({ listId: 12, leads }, ctx);
  assertEquals(calls[0].url, "https://api.heyreach.io/api/public/list/AddLeadsToListV2");
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), { listId: 12, leads });
});

Deno.test("list-add-leads: the per-lead counts are returned untouched", async () => {
  const counts = { addedLeadsCount: 1, updatedLeadsCount: 2, failedLeadsCount: 3 };
  const { ctx } = mockCtx([{ status: 200, body: counts }]);
  assertEquals(await action.execute!({ listId: 12, leads }, ctx), counts);
});
