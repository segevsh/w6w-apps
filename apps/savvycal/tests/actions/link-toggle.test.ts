import { assertEquals } from "@std/assert";
import linkToggle from "../../actions/link-toggle.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("link-toggle: POST /v1/links/{id}/toggle", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "link_1", state: "disabled" } }]);
  const out = await linkToggle.execute({ linkId: "link_1" }, ctx) as { state: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/links/link_1/toggle");
  assertEquals(out.state, "disabled");
  assertEquals(linkToggle.idempotent, false);
});
