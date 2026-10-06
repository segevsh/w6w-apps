import { assertEquals } from "@std/assert";
import { mockEgnyteCtx } from "../_helpers.ts";
import action from "../../actions/link-delete.ts";

Deno.test("link-delete: DELETEs /v1/links/<id>", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: "" }]);
  assertEquals(await action.execute({ linkId: "L1" }, ctx), { success: true });
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v1/links/L1");
  assertEquals(calls[0].method, "DELETE");
});
