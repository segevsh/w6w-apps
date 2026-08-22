import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/asset-update.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

Deno.test("asset-update: posts the changed fields, form-encoded", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ publicId: "products/hero", tags: "a,b" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1_1/acme/resources/image/upload/products/hero",
  );
  assertEquals(new URLSearchParams(calls[0].body!).get("tags"), "a,b");
});

/** The tag field here replaces everything; the additive route is asset-tag. */
Deno.test("asset-update: the tags hint warns that it replaces", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>).find((p) => p.key === "tags")!;
  assert(/REPLACES/.test(p.hint!), p.hint);
  assert(/Manage Tags/i.test(action.description!), action.description);
});

Deno.test("asset-update: an empty update is refused rather than sent", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({ publicId: "x" }, ctx), Error, "nothing");
  assertEquals(calls.length, 0);
});
