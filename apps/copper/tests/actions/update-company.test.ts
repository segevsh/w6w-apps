import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-company.ts";

test("update-company: PUTs to /companies/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 2 } }]);
  await action.execute({ companyId: 2, name: "Renamed" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/companies/2");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
});

test("update-company: forwards an explicit null to clear a field", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ companyId: 2, details: null }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { details: null });
});

test("update-company: is an idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
