import { assertEquals } from "@std/assert";
import shareLinkRevoke from "../../actions/share-link-revoke.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("share-link-revoke: DELETE /links/{id}, empty 200/204 body is fine", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{ status: 204 }]);
  const res = await shareLinkRevoke.execute({ linkId: "L1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/workdrive/api/v1/links/L1");
  assertEquals(calls[0].body, null);
  assertEquals(res, { revoked: true });
});
