import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/organization-list.ts";

test("organization-list: GETs /organizations with no orgId header", async () => {
  const { ctx, calls } = mockDeskCtx([
    { body: { data: [{ id: "1", companyName: "Zylker" }] } },
  ]);
  const out = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/organizations");
  assertEquals(calls[0].headers.orgid, undefined);
  assertEquals(out.data, [{ id: "1", companyName: "Zylker" }]);
});

test("organization-list: returns an empty list when data is absent", async () => {
  const { ctx } = mockDeskCtx([{ body: { data: [] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(out.data, []);
});
