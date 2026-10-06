import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import browserSessionList from "../../actions/browser-session-list.ts";

const HOST = "https://api.skyvern.com";

Deno.test("browser-session-list: GETs /v1/browser_sessions and wraps the array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ browser_session_id: "pbs_1" }] }]);
  const out = await browserSessionList.execute({}, ctx);
  assertEquals(out, { browser_sessions: [{ browser_session_id: "pbs_1" }], count: 1 });
  assertEquals(calls[0].url, `${HOST}/v1/browser_sessions`);
});
