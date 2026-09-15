import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/article-create.ts";

Deno.test("article-create: POSTs to /2.0/article with mapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, intern_name: "Webhosting" } }]);
  const result = await action.execute!({
    articleTypeId: 2,
    internName: "Webhosting",
    internCode: "wh-2019",
    salePrice: "49.00",
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/article");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.article_type_id, 2);
  assertEquals(body.intern_name, "Webhosting");
  assertEquals(body.intern_code, "wh-2019");
  assertEquals(body.sale_price, "49.00");
  assertEquals(result, { id: 1, intern_name: "Webhosting" });
});
