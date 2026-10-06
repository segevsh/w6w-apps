import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-clock.ts";
import { API_ROOT, exec, mockCtx } from "../_helpers.ts";

Deno.test("get-clock: GETs /v2/clock, with users_id only when given", async () => {
  const a = mockCtx([{ body: { running: { id: 1 }, stopped: null, current_time: "t" } }]);
  assertEquals(await exec(action, {}, a.ctx), {
    running: { id: 1 },
    stopped: null,
    current_time: "t",
  });
  assertEquals(a.calls[0].url, `${API_ROOT}/v2/clock`);
  const b = mockCtx([{ body: { running: null } }]);
  const out = await exec(action, { usersId: "4" }, b.ctx);
  assertEquals(b.calls[0].url, `${API_ROOT}/v2/clock?users_id=4`);
  assertEquals(out.running, null);
});

Deno.test("get-clock: a non-JSON body fails with the HTTP status", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const e = await assertRejects(() => exec(action, {}, ctx), Error);
  assert(String(e).includes("502"));
});
