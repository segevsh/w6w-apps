import { assertEquals } from "@std/assert";
import { mockSignCtx } from "../_helpers.ts";
import action from "../../actions/template-get.ts";

Deno.test("template-get: GET /templates/{id} with no query params", async () => {
  const { ctx, calls } = mockSignCtx([
    {
      body: { code: 0, status: "success", templates: { template_id: "t1", template_name: "NDA" } },
    },
  ]);

  const out = await action.execute({ templateId: "t1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/templates/t1");
  assertEquals(url.searchParams.has("data"), false);
  assertEquals(out, { template_id: "t1", template_name: "NDA" });
});
