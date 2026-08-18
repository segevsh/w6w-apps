import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/folder-create.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

Deno.test("folder-create: POSTs the path, creating parents", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true } }], conn);
  await action.execute!({ path: "products/2026/spring" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1_1/acme/folders/products/2026/spring");
});

Deno.test("folder-create: an empty path is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({ path: " " }, ctx), Error, "path");
});
