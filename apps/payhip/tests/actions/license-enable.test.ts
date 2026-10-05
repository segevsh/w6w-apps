import { assertRejects } from "@std/assert";
import { KEY } from "../_fixtures.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/license-enable.ts";
import { putSuite } from "../_suite.ts";

putSuite("license-enable", action, "enable");

Deno.test("license-enable: a JSON body without data surfaces Payhip's message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "bad thing" } }]);
  await assertRejects(() => Promise.resolve(action.execute(KEY, ctx)), Error, "bad thing");
});
