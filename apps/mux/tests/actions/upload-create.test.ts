import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/upload-create.ts";

Deno.test("upload-create: mints an upload with the asset settings nested", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { data: { id: "up1", url: "https://storage.example/put" } },
  }]);
  await action.execute!({
    corsOrigin: "https://app.example.com",
    passthrough: "order-1",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/video/v1/uploads");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.cors_origin, "https://app.example.com");
  assertEquals(sent.new_asset_settings.passthrough, "order-1");
});

/** Without it the browser preflight fails and the upload never starts. */
Deno.test("upload-create: a missing CORS origin is refused with the reason", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => await action.execute!({}, ctx), Error);
  assert(/preflight/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});

Deno.test("upload-create: the timeout is capped at Mux's maximum", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: {} } }]);
  await action.execute!({ corsOrigin: "https://x.test", timeout: 9999999 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).timeout, 604800);
});
