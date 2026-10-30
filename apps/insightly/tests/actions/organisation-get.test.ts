import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/organisation-get.ts";

test("organisation-get: GETs /Organisations/{id}", async () => {
  const { ctx, calls } = mockInsightlyCtx([{
    body: { ORGANISATION_ID: 1, ORGANISATION_NAME: "Acme" },
  }]);
  const out = await action.execute({ organisationId: 1 }, ctx);
  assertEquals(calls[0].url, "https://api.na1.insightly.com/v3.1/Organisations/1");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { ORGANISATION_ID: 1, ORGANISATION_NAME: "Acme" });
});
