import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import browserProfileDelete from "../../actions/browser-profile-delete.ts";

const HOST = "https://api.skyvern.com";

Deno.test("browser-profile-delete: DELETEs and tolerates the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await browserProfileDelete.execute({ profileId: "bp_1" }, ctx), {
    success: true,
    browser_profile_id: "bp_1",
  });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, `${HOST}/v1/browser_profiles/bp_1`);
});

// ---- credentials -------------------------------------------------------------------------
