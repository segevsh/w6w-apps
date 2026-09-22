import { assertEquals } from "@std/assert";
import listStorePages from "../../actions/list-store-pages.ts";
import { API_ROOT, errorBody, mockCtx, pagination, queryOf } from "../_helpers.ts";

Deno.test("list-store-pages: GET /1.0/commerce/store_pages with the cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      pagination: pagination({ hasNextPage: true, nextPageCursor: "CUR2" }),
      storePages: [{ id: "SP1", isEnabled: true, title: "Shop", urlSlug: "shop" }],
    },
  }]);
  const out = await listStorePages.execute!({ cursor: "CUR1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/1.0/commerce/store_pages?cursor=CUR1`);
  assertEquals(out.pagination?.nextPageCursor, "CUR2");
  assertEquals(out.storePages?.[0].urlSlug, "shop");
});

Deno.test("list-store-pages: no cursor means no query string at all", async () => {
  const { ctx, calls } = mockCtx([{ body: { pagination: pagination(), storePages: [] } }]);
  await listStorePages.execute!({}, ctx);

  assertEquals(calls[0].url, `${API_ROOT}/1.0/commerce/store_pages`);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("list-store-pages: a vendor 400 is surfaced with its subtype", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("INVALID_REQUEST_ERROR", {
      subtype: "INVALID_ARGUMENT",
      message: "cursor is invalid",
    }),
  }]);

  let message = "";
  try {
    await listStorePages.execute!({ cursor: "nope" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("400 INVALID_REQUEST_ERROR/INVALID_ARGUMENT"), true);
  assertEquals(message.includes("cursor is invalid"), true);
});
