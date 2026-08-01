import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-image.ts";

Deno.test("create-image: POSTs /v2/create-image with template_id in the query and data in the body", async () => {
  const body = { status: "success", download_url: "https://x/y.jpg", transaction_ref: "t1" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { templateId: "tpl-1", data: { text_1: "hello" } },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/create-image");
  assertEquals(url.searchParams.get("template_id"), "tpl-1");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { text_1: "hello" });
  assertEquals(result, body);
});

Deno.test("create-image: forwards optional query params, omitting unset ones", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await action.execute!(
    {
      templateId: "tpl-1",
      data: {},
      outputImageType: "pngOnly",
      expiration: 60,
      meta: "order-42",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("output_image_type"), "pngOnly");
  assertEquals(url.searchParams.get("expiration"), "60");
  assertEquals(url.searchParams.get("meta"), "order-42");
});

Deno.test("create-image: throws when the API reports status: error", async () => {
  const { ctx } = mockCtx([{ body: { status: "error", message: "invalid template" } }]);
  await assertRejects(
    () => Promise.resolve(action.execute!({ templateId: "bad", data: {} }, ctx)),
    Error,
    "invalid template",
  );
});
