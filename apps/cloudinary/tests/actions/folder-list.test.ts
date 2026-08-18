import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/folder-list.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

Deno.test("folder-list: the top level and a sub-path are different routes", async () => {
  const top = mockCtx([{ status: 200, body: { folders: [] } }], conn);
  await action.execute!({}, top.ctx);
  assertEquals(new URL(top.calls[0].url).pathname, "/v1_1/acme/folders");

  const sub = mockCtx([{ status: 200, body: { folders: [] } }], conn);
  await action.execute!({ path: "/products/2026/" }, sub.ctx);
  assertEquals(new URL(sub.calls[0].url).pathname, "/v1_1/acme/folders/products/2026");
});
