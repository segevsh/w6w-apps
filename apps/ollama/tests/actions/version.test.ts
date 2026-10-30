import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { BASE, display, ok } from "./_shared.ts";
import action from "../../actions/version.ts";

test("version: reads /api/version", async () => {
  const { ctx, calls } = mockCtx([ok({ version: "0.34.1" })], { display });
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, `${BASE}/api/version`);
  assertEquals(result, { version: "0.34.1" });
});

test("version: an https connection on a custom port builds the matching URL", async () => {
  const { ctx, calls } = mockCtx([ok({ version: "0.34.1" })], {
    display: { scheme: "https", host: "ollama.example.com", port: 443 },
  });
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://ollama.example.com:443/api/version");
});
