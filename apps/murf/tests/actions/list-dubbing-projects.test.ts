import { assertEquals } from "@std/assert";
import action from "../../actions/list-dubbing-projects.ts";
import { exec, failure, mockCtx } from "../_helpers.ts";

Deno.test("list-dubbing-projects: passes limit and next as query and returns the page", async () => {
  const body = {
    projects: [{ project_id: "p1", dubbing_type: "AUTOMATED", target_locales: [] }],
    next: "tok2",
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await exec(action, { limit: 10, next: "tok1" }, ctx);
  assertEquals(calls[0].url, "https://api.murf.ai/v1/murfdub/projects/list?limit=10&next=tok1");
  assertEquals(out, body);
});

Deno.test("list-dubbing-projects: no params sends no query; a 403 fails", async () => {
  const { ctx, calls } = mockCtx([{ body: { projects: [] } }]);
  await exec(action, {}, ctx);
  assertEquals(calls[0].url, "https://api.murf.ai/v1/murfdub/projects/list");
  const bad = mockCtx([{ status: 403, body: { error_message: "Invalid", error_code: 403 } }]);
  assertEquals((await failure(action, {}, bad.ctx)).includes("Invalid"), true);
});
