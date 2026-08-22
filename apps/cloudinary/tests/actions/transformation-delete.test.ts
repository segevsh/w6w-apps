import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/transformation-delete.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

/** Deleting a definition deletes the renditions built from it. */
Deno.test("transformation-delete: refuses without confirmation", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({ name: "thumb" }, ctx), Error, "confirm");
  assertEquals(calls.length, 0);
});

Deno.test("transformation-delete: confirmed, it deletes", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { message: "deleted" } }], conn);
  await action.execute!({ name: "thumb", confirm: true }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1_1/acme/transformations/thumb");
});

Deno.test("transformation-delete: says the originals are safe", () => {
  assert(/[Oo]riginals are never touched/.test(action.description!), action.description);
});
