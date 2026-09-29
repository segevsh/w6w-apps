import { assertEquals } from "@std/assert";
import { mockCreatorCtx } from "../_helpers.ts";
import action from "../../actions/file-download.ts";

Deno.test("file-download: GETs .../<record>/<field>/download and base64-encodes binary content", async () => {
  const { ctx, calls } = mockCreatorCtx([
    { status: 200, headers: { "content-type": "image/png" }, body: "\x89PNG\r\n" },
  ]);
  const out = await action.execute(
    {
      accountOwnerName: "jason18",
      appLinkName: "zylker-store",
      reportLinkName: "Inventory_Report",
      recordId: "3888834000000114050",
      fieldLinkName: "Product_Manual",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    url.pathname,
    "/creator/v2/data/jason18/zylker-store/report/Inventory_Report/3888834000000114050/Product_Manual/download",
  );
  assertEquals(out.base64, true);
  assertEquals(out.contentType, "image/png");
});

Deno.test("file-download: returns text content as-is, base64 false", async () => {
  const { ctx } = mockCreatorCtx([
    { status: 200, headers: { "content-type": "text/plain" }, body: "hello" },
  ]);
  const out = await action.execute(
    {
      accountOwnerName: "jason18",
      appLinkName: "zylker-store",
      reportLinkName: "Inventory_Report",
      recordId: "1",
      fieldLinkName: "Notes",
    },
    ctx,
  );
  assertEquals(out, { content: "hello", contentType: "text/plain", base64: false });
});
