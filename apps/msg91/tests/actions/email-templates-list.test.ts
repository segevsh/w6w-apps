import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/email-templates-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("email-templates-list: GET /email/templates maps status and filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: 1 }] } }]);
  const out = await action.execute({
    keyword: "otp",
    status: "pending",
    page: 2,
    perPage: 10,
    withVersions: "yes",
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v5/email/templates");
  assertEquals(queryOf(calls[0].url), {
    keyword: "otp",
    page: "2",
    per_page: "10",
    status_id: "1",
    search_in: "name",
    with: "versions",
  });
  assertEquals(out, { templates: { data: [{ id: 1 }] } });
});

Deno.test("email-templates-list: defaults to verified templates", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), { status_id: "2" });
});

Deno.test("email-templates-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].headers.authkey, undefined);
  assert(!calls[0].url.toLowerCase().includes("authkey"));
  assert(calls[0].url.startsWith("https://control.msg91.com/api/v5/"));
});

Deno.test("email-templates-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ body: { type: "error", message: "Auth Key missing" } }]);
  const err = await assertRejects(async () => await action.execute({}, ctx)) as Error;
  assert(err.message.includes("Auth Key missing"));
});
