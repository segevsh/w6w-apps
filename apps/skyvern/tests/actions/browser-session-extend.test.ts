import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import browserSessionExtend from "../../actions/browser-session-extend.ts";

const HOST = "https://api.skyvern.com";

Deno.test("browser-session-extend: POSTs additional_minutes; merges the 200 body", async () => {
  const { ctx, calls } = mockCtx([{ body: { browser_session_id: "pbs_1", timeout: 90 } }]);
  const out = await browserSessionExtend.execute(
    { browserSessionId: "pbs_1", additionalMinutes: 30 },
    ctx,
  );
  assertEquals(out, { accepted: true, browser_session_id: "pbs_1", timeout: 90 });
  assertEquals(calls[0].url, `${HOST}/v1/browser_sessions/pbs_1/extend`);
  assertEquals(jsonBody(calls[0]), { additional_minutes: 30 });
});

Deno.test("browser-session-extend: a 202 with no body is still accepted", async () => {
  const { ctx } = mockCtx([{ status: 202 }]);
  const out = await browserSessionExtend.execute(
    { browserSessionId: "pbs_1", additionalMinutes: 5 },
    ctx,
  );
  assertEquals(out, { accepted: true, browser_session_id: "pbs_1" });
});

// ---- browser profiles --------------------------------------------------------------------
