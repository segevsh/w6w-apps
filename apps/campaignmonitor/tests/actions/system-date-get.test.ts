import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import systemDateGet from "../../actions/system-date-get.ts";
import { API_PATH, mockCtx, pathOf } from "../_helpers.ts";

test("system-date-get: GETs /systemdate.json and returns the one date string", async () => {
  const { ctx, calls } = mockCtx([{ body: { SystemDate: "2010-11-16 14:18:00" } }]);
  const out = await systemDateGet.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/systemdate.json`);
  assertEquals(out.SystemDate, "2010-11-16 14:18:00");
});

/**
 * This is the endpoint both auth methods probe, so it must stay free of any
 * caller-supplied input that could redirect it.
 */
test("system-date-get: takes no params at all", () => {
  assertEquals(systemDateGet.params, []);
});
