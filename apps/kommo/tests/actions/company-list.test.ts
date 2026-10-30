import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-list.ts";

const conn = { display: { accountDomain: "acme.kommo.com" } };

test("company-list: GETs /companies with page and limit", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _embedded: { companies: [{ id: 1 }] } } }],
    conn,
  );
  const out = await action.execute!({ page: 1, limit: 25 }, ctx);
  assertEquals(calls[0].url, "https://acme.kommo.com/api/v4/companies?page=1&limit=25");
  assertEquals(out.companies, [{ id: 1 }]);
});

test("company-list: withEmbed joins contacts and leads", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _embedded: { companies: [] } } }],
    conn,
  );
  await action.execute!({ withEmbed: ["contacts", "leads"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("with"), "contacts,leads");
});

test("company-list: type is search, and resource is company", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "company");
});
