import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/organisation-create.ts";

test("organisation-create: POSTs /Organisations with the fields", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ status: 201, body: { ORGANISATION_ID: 1 } }]);
  await action.execute({ organisationName: "Acme", website: "https://acme.test" }, ctx);
  assertEquals(calls[0].url, "https://api.na1.insightly.com/v3.1/Organisations");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    ORGANISATION_NAME: "Acme",
    WEBSITE: "https://acme.test",
  });
});
