import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/version-get.ts";

const conn = { display: { baseUrl: "https://search.example.com" } };

test("version-get: reads the engine version", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { pkgVersion: "1.15.2" } }], conn);
  const result = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://search.example.com/version");
  assertEquals(result.pkgVersion, "1.15.2");
});
