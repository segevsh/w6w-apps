import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/asset-explicit.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

Deno.test("asset-explicit: sends the public id, the required type and the eager work", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { public_id: "hero" } }], conn);
  await action.execute!({ publicId: "hero", eager: "w_400,c_fill" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1_1/acme/image/explicit");
  const sent = new URLSearchParams(calls[0].body!);
  assertEquals(sent.get("public_id"), "hero");
  // Cloudinary requires `type` on this route.
  assertEquals(sent.get("type"), "upload");
  assertEquals(sent.get("eager"), "w_400,c_fill");
  // Async by default: several renditions can time a synchronous call out.
  assertEquals(sent.get("eager_async"), "true");
});

Deno.test("asset-explicit: with nothing to do it refuses rather than calling", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ publicId: "hero" }, ctx),
    Error,
    "nothing to do",
  );
  assertEquals(calls.length, 0);
});
