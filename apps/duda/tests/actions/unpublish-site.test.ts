import { assertEquals } from "@std/assert";
import { EU, mockConnectedCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/unpublish-site.ts";

Deno.test("unpublish-site: POSTs to the unpublish path and reports the 204", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 204 }], "EU");
  const result = await action.execute!({ siteName: "abc1234d" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${EU}/api/sites/multiscreen/unpublish/abc1234d`);
  assertEquals(result, { status: 204 });
});

Deno.test("unpublish-site: is idempotent", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("unpublish-site: requires the site alias", () => {
  assertEquals(action.params!.find((p) => p.key === "siteName")?.required, true);
  assertEquals(
    pathOf("https://api.duda.co/api/sites/multiscreen/unpublish/x"),
    "/api/sites/multiscreen/unpublish/x",
  );
});
