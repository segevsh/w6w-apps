import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/me-get.ts";

Deno.test("me-get: GETs /rest/v1.0/me with no company header", async () => {
  const me = { id: 1, login: "a@b.co", name: "Ada" };
  const { ctx, calls } = mockCtx([{ body: me }], { companyId: 5 });
  const out = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1.0/me");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["procore-company-id"], undefined);
  assertEquals(out, me);
});

Deno.test("me-get: forwards company_id/project_id as query parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ companyId: 5, projectId: 8 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("company_id"), "5");
  assertEquals(url.searchParams.get("project_id"), "8");
  assertEquals(calls[0].headers["procore-company-id"], undefined);
});
