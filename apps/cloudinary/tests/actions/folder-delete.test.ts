import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/folder-delete.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

Deno.test("folder-delete: DELETEs the folder path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { deleted: ["products/old"] } }], conn);
  await action.execute!({ path: "products/old" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1_1/acme/folders/products/old");
});

/** Cloudinary refuses a non-empty folder, which is the guard. */
Deno.test("folder-delete: has no confirmation flag, and explains why", () => {
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assert(!keys.includes("confirm"), keys.join(","));
  assert(/refuses/i.test(action.description!), action.description);
});
