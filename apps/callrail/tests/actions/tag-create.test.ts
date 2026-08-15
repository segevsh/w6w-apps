import { assertEquals } from "@std/assert";
import tagCreate from "../../actions/tag-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tag-create: POSTs name, company_id, color and tag_level", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1", name: "Existing Customer" } }]);
  const out = await tagCreate.execute(
    { accountId: "ACC1", name: "Existing Customer", companyId: "COM1", color: "gray1" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/tags.json");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Existing Customer",
    company_id: "COM1",
    color: "gray1",
  });
  assertEquals(out, { id: "1", name: "Existing Customer" });
});
