import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import versionGet from "../../actions/version-get.ts";
import { envelope, mockWrikeCtx, pathOf } from "../_helpers.ts";

test("version-get: GETs /version", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: envelope([{ major: 4, minor: 0 }]) }]);
  const out = await versionGet.execute({}, ctx) as { major: number; minor: number };
  assertEquals(pathOf(calls[0].url), "/api/v4/version");
  assertEquals(out, { major: 4, minor: 0 });
});
