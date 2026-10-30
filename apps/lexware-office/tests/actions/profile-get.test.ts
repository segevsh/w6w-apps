import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/profile-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("profile-get: GET /v1/profile and returns the organization", async () => {
  const { ctx, calls } = mockCtx([{
    body: { organizationId: "o", companyName: "Testfirma GmbH" },
  }]);
  const out = await action.execute({}, ctx) as { companyName: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/profile");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(out.companyName, "Testfirma GmbH");
});
