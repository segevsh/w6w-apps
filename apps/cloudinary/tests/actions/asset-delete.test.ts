import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/asset-delete.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

/** Naming ids IS the statement of intent. */
Deno.test("asset-delete: deleting named ids needs no confirmation", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { deleted: {} } }], conn);
  await action.execute!({ publicIds: "a,b" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.pathname, "/v1_1/acme/resources/image/upload");
  assertEquals(url.searchParams.getAll("public_ids[]"), ["a", "b"]);
  // Deleting does not flush the CDN on its own.
  assertEquals(url.searchParams.get("invalidate"), "true");
});

Deno.test("asset-delete: a prefix delete without confirmation is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ prefix: "products/" }, ctx),
    Error,
    "confirm",
  );
  assertEquals(calls.length, 0);
});

Deno.test("asset-delete: delete-all without confirmation is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({ all: true }, ctx), Error, "confirm");
});

Deno.test("asset-delete: combining selectors is refused with both named", async () => {
  const { ctx } = mockCtx([], conn);
  const err = await assertRejects(
    async () => await action.execute!({ publicIds: "a", prefix: "p/", confirm: true }, ctx),
    Error,
  );
  assert(String(err).includes("publicIds + prefix"), String(err));
});

Deno.test("asset-delete: more than 100 ids is refused locally", async () => {
  const { ctx } = mockCtx([], conn);
  const many = Array.from({ length: 101 }, (_, i) => `id${i}`).join(",");
  await assertRejects(async () => await action.execute!({ publicIds: many }, ctx), Error, "100");
});

/** Recovery depends on an account setting this API cannot check. */
Deno.test("asset-delete: the confirmation hint does not promise a way back", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "confirm")!;
  assert(/backup/i.test(p.hint!), p.hint);
});
