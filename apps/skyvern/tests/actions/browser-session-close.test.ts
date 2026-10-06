import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import browserSessionClose from "../../actions/browser-session-close.ts";

const HOST = "https://api.skyvern.com";

Deno.test("browser-session-close: POSTs /close; a 404 raises", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  assertEquals(await browserSessionClose.execute({ browserSessionId: "pbs_1" }, ctx), {
    success: true,
    browser_session_id: "pbs_1",
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${HOST}/v1/browser_sessions/pbs_1/close`);

  const gone = mockCtx([{ status: 404, body: { detail: "Browser session not found" } }]);
  await assertRejects(
    async () => await browserSessionClose.execute({ browserSessionId: "pbs_x" }, gone.ctx),
    Error,
    "Browser session not found",
  );
});
