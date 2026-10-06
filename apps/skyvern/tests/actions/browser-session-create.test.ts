import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import browserSessionCreate from "../../actions/browser-session-create.ts";

const HOST = "https://api.skyvern.com";

Deno.test("browser-session-create: POSTs /v1/browser_sessions with snake_case body", async () => {
  const { ctx, calls } = mockCtx([{ body: { browser_session_id: "pbs_1" } }]);
  const out = await browserSessionCreate.execute({
    url: "https://example.com",
    timeout: 30,
    browserType: "chrome",
    browserProfileId: "bp_1",
    generateBrowserProfile: true,
  }, ctx);
  assertEquals((out as { browser_session_id: string }).browser_session_id, "pbs_1");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${HOST}/v1/browser_sessions`);
  assertEquals(jsonBody(calls[0]), {
    url: "https://example.com",
    timeout: 30,
    browser_type: "chrome",
    browser_profile_id: "bp_1",
    generate_browser_profile: true,
  });
});

Deno.test("browser-session-create: empty input sends an empty JSON object", async () => {
  const { ctx, calls } = mockCtx([{ body: { browser_session_id: "pbs_2" } }]);
  await browserSessionCreate.execute({}, ctx);
  assertEquals(jsonBody(calls[0]), {});
});
