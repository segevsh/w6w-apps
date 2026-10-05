import { assertEquals } from "@std/assert";
import { KEY, LICENSE } from "../_fixtures.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/license-disable.ts";
import { putSuite } from "../_suite.ts";

putSuite("license-disable", action, "disable");

Deno.test("license-disable: returns the disabled record", async () => {
  const { ctx } = mockCtx([{ body: { data: { ...LICENSE, enabled: false } } }]);
  assertEquals(((await action.execute(KEY, ctx)) as { enabled: boolean }).enabled, false);
});
