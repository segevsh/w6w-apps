import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import sessionGet from "../../actions/session-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

test("session-get: fetches the session by devin id", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      session_id: "devin-abc123",
      status: "exit",
      url: "https://app.devin.ai/sessions/devin-abc123",
    },
  }]);
  const out = await sessionGet.execute({ devinId: "devin-abc123" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/sessions/devin-abc123`);
  assertEquals(out.status, "exit");
});

test("session-get: URL-encodes the session id", async () => {
  const { ctx, calls } = mockCtx([{ body: { session_id: "devin x", status: "new" } }]);
  await sessionGet.execute({ devinId: "devin x" }, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/sessions/devin%20x`);
});

test("session-get: is a read action requiring devinId", () => {
  assertEquals(sessionGet.type, "read");
  assertEquals(sessionGet.params?.find((p) => p.key === "devinId")?.required, true);
});
