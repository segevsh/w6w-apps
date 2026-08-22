import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-get.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

Deno.test("company-get: uses the connection's company by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { uuid: "co-1" } }], conn);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/companies/co-1");
});

Deno.test("company-get: an explicit company overrides it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ companyId: "co-2" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/companies/co-2");
});

Deno.test("company-get: a connection with no company says where to look", async () => {
  const { ctx } = mockCtx([], { display: { environment: "demo" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "token-info");
});
