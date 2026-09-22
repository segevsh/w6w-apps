import { assertEquals } from "@std/assert";
import { mockConnectedCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/publish-site.ts";

Deno.test("publish-site: POSTs to the publish path and reports the 204", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 204 }]);
  const result = await action.execute!({ siteName: "abc1234d" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/sites/multiscreen/publish/abc1234d");
  assertEquals(calls[0].body, null);
  assertEquals(result, { status: 204 });
});

/** Re-publishing an already-published site converges, so a retry is safe. */
Deno.test("publish-site: is idempotent", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("publish-site: a 400 with an ErrorRDT body is surfaced verbatim", async () => {
  const { ctx } = mockConnectedCtx([{
    status: 400,
    body: { error_code: "InvalidState", message: "Site is already unpublished" },
  }]);
  const err = await Promise.resolve(action.execute!({ siteName: "abc" }, ctx)).catch((e: Error) =>
    e
  );
  assertEquals(
    (err as Error).message,
    "Duda 400 for POST /api/sites/multiscreen/publish/abc: InvalidState: Site is already unpublished",
  );
});
