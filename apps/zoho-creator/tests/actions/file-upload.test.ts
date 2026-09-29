import { assertEquals } from "@std/assert";
import { mockCreatorCtx } from "../_helpers.ts";
import action from "../../actions/file-upload.ts";

Deno.test("file-upload: not idempotent", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("file-upload: POSTs multipart/form-data to .../<record>/<field>/upload", async () => {
  const { ctx, calls } = mockCreatorCtx([
    {
      body: {
        code: 3000,
        filename: "a.png",
        filepath: "1_a.png",
        message: "File uploaded successfully !",
      },
    },
  ]);
  const out = await action.execute(
    {
      accountOwnerName: "jason18",
      appLinkName: "zylker-store",
      reportLinkName: "Inventory_Report",
      recordId: "3888834000000114050",
      fieldLinkName: "Product_Manual",
      file: new Blob(["hi"]),
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    url.pathname,
    "/creator/v2/data/jason18/zylker-store/report/Inventory_Report/3888834000000114050/Product_Manual/upload",
  );
  assertEquals(calls[0].body, "[FormData]");
  assertEquals(out, {
    filename: "a.png",
    filepath: "1_a.png",
    message: "File uploaded successfully !",
  });
});
