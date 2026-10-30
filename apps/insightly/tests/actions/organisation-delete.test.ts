import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/organisation-delete.ts";

test("organisation-delete: DELETEs /Organisations/{id}", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ status: 202, body: undefined }]);
  const out = await action.execute({ organisationId: 1 }, ctx);
  assertEquals(calls[0].url, "https://api.na1.insightly.com/v3.1/Organisations/1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, {});
});
