import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/upload-preset-list.ts";

const conn = { display: { cloudName: "acme", region: "us" } };

Deno.test("upload-preset-list: reads the stored upload settings", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { presets: [{ name: "signed_products" }] },
  }], conn);
  const out = await action.execute!({}, ctx) as { presets: unknown[] };
  assertEquals(out.presets.length, 1);
  assertEquals(new URL(calls[0].url).pathname, "/v1_1/acme/upload_presets");
});
