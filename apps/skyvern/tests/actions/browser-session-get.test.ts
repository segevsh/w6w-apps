import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import browserSessionGet from "../../actions/browser-session-get.ts";

const HOST = "https://api.skyvern.com";

Deno.test("browser-session-get: GETs /v1/browser_sessions/{id}", async () => {
  const s = { browser_session_id: "pbs_1", status: "running" };
  const { ctx, calls } = mockCtx([{ body: s }]);
  assertEquals(await browserSessionGet.execute({ browserSessionId: "pbs_1" }, ctx), s);
  assertEquals(calls[0].url, `${HOST}/v1/browser_sessions/pbs_1`);
});
