import { assertEquals, assertRejects } from "@std/assert";
import imageCreateHtml from "../../actions/image-create-html.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("image-create-html: POSTs html/css and returns the vendor's {id, url}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "img-1", url: "https://hcti.io/v1/image/img-1" },
  }]);
  const out = await imageCreateHtml.execute({
    html: "<div>Hi</div>",
    css: "div{color:red}",
    device_scale: 2,
    format: "webp",
    metadata: { order: "7" },
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/image");
  assertEquals(JSON.parse(calls[0].body!), {
    html: "<div>Hi</div>",
    css: "div{color:red}",
    format: "webp",
    device_scale: 2,
    metadata: { order: "7" },
  });
  assertEquals(out, { id: "img-1", url: "https://hcti.io/v1/image/img-1" });
  // Credentials are never set by an action; `sign` adds them.
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("image-create-html: html is required and makes no request without it", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await imageCreateHtml.execute({ html: "" }, ctx),
    Error,
    "html is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("image-create-html: a 400 surfaces the vendor's field errors", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("Bad Request", "Invalid", 400, [{ path: "device_scale", message: "too big" }]),
  }]);
  const err = await assertRejects(
    async () => await imageCreateHtml.execute({ html: "<b/>" }, ctx),
    Error,
  );
  assertEquals(err.message.includes("device_scale: too big"), true, err.message);
});

Deno.test("image-create-html: spends credits, so it is not declared idempotent", () => {
  assertEquals(imageCreateHtml.idempotent, false);
});
