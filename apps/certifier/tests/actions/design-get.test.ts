import { assertEquals } from "@std/assert";
import action from "../../actions/design-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("design-get: GET /v1/designs/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "d1", type: "certificate", previewUrl: "https://x/p.png" },
  }]);
  const out = await action.execute({ designId: "d1" }, ctx) as { type: string };
  assertEquals(pathOf(calls[0].url), "/v1/designs/d1");
  assertEquals(out.type, "certificate");
});
