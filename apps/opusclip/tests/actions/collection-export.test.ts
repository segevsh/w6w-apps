import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import collectionExport from "../../actions/collection-export.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("collection-export: POSTs an empty body to the export path", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: envelope({ contentList: [{ contentId: "P1.C1", uriForExport: "u" }] }) },
  ]);
  const out = await collectionExport.execute({ collectionId: "col1" }, ctx) as {
    contentList: unknown[];
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/collections/col1/export");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out.contentList.length, 1);
});

test("collection-export: is declared a read action despite being a POST", () => {
  assertEquals(collectionExport.type, "read");
});
