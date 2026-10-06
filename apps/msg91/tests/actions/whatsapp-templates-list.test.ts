import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/whatsapp-templates-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("whatsapp-templates-list: number is a path segment; filters are query", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ name: "t" }] } }]);
  const out = await action.execute({
    number: "15550236673",
    templateName: "order",
    templateStatus: "approved",
    templateLanguage: "en",
  }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v5/whatsapp/get-template-client/15550236673");
  assertEquals(queryOf(calls[0].url), {
    template_name: "order",
    template_status: "approved",
    template_language: "en",
  });
  assertEquals(out, { templates: [{ name: "t" }] });
});

Deno.test("whatsapp-templates-list: pagination needs both page size and number", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }, { body: { data: [] } }]);
  await action.execute({ number: "1", pageSize: 25 }, ctx);
  await action.execute({ number: "1", pageSize: 25, pageNumber: 2 }, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(queryOf(calls[1].url), { pagination: "true", page_size: "25", page_num: "2" });
});

Deno.test("whatsapp-templates-list: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ number: "9199" }, ctx);
  assertEquals(calls[0].headers.authkey, undefined);
  assert(!calls[0].url.toLowerCase().includes("authkey"));
  assert(calls[0].url.startsWith("https://control.msg91.com/api/v5/"));
});

Deno.test("whatsapp-templates-list: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ body: { type: "error", message: "Auth Key missing" } }]);
  const err = await assertRejects(async () =>
    await action.execute({ number: "9199" }, ctx)
  ) as Error;
  assert(err.message.includes("Auth Key missing"));
});
