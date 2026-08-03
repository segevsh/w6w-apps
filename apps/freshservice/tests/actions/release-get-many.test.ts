import { assertEquals } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/release-get-many.ts";

Deno.test("release-get-many: GETs /releases and unwraps `releases`", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { releases: [{ id: 1 }] } }]);
  const out = await action.execute({ page: 2 }, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/releases?page=2");
  assertEquals(out, { releases: [{ id: 1 }] });
});
