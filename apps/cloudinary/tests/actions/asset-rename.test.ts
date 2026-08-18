import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/asset-rename.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

Deno.test("asset-rename: posts both ids, invalidating the old one by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { public_id: "archive/hero" } }], conn);
  await action.execute!({ fromPublicId: "products/hero", toPublicId: "archive/hero" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1_1/acme/image/rename");
  const sent = new URLSearchParams(calls[0].body!);
  assertEquals(sent.get("from_public_id"), "products/hero");
  assertEquals(sent.get("to_public_id"), "archive/hero");
  assertEquals(sent.get("invalidate"), "true");
});

Deno.test("asset-rename: renaming to the same id is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ fromPublicId: "a", toPublicId: "a" }, ctx),
    Error,
    "same",
  );
  assertEquals(calls.length, 0);
});

/** The public id is in every delivery URL. */
Deno.test("asset-rename: says that existing URLs break", () => {
  assert(/URL.*break|break/i.test(action.description!), action.description);
});
