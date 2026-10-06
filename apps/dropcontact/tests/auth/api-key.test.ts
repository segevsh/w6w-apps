import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { apiKey: "SECRET-TOKEN" };

Deno.test("api-key: sign sets X-Access-Token and nothing else", async () => {
  const { ctx } = mockCtx();
  const out = await apiKey.sign!({
    request: { url: "https://api.dropcontact.com/v1/enrich/all", method: "POST", headers: {} },
    credential: { apiKey: " SECRET-TOKEN " },
  }, ctx);
  assertEquals(out.headers["x-access-token"], "SECRET-TOKEN");
  assertEquals(out.headers.authorization, undefined);
});

Deno.test("api-key: test posts one empty contact and passes on credits_left", async () => {
  const { ctx, calls } = mockCtx([{
    body: { error: false, success: true, request_id: "r1", credits_left: 42 },
  }]);
  assertEquals(await apiKey.test!({ credential: cred }, ctx), { ok: true });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.dropcontact.com/v1/enrich/all");
  assertEquals(JSON.parse(calls[0].body!), { data: [{}] });
  assertEquals(calls[0].headers["x-access-token"], "SECRET-TOKEN");
});

Deno.test("api-key: a 200 without credits_left is not a pass", async () => {
  const { ctx } = mockCtx([{ body: { error: false, success: true } }]);
  assertEquals((await apiKey.test!({ credential: cred }, ctx)).ok, false);
});

Deno.test("api-key: 401 and 403 are rejections that never echo the token", async () => {
  for (
    const [status, reason, needle] of [
      [401, "Unknown account", "rejected"],
      [401, "No api key received.", "rejected"],
      [403, "Token exceeded quota", "quota"],
    ] as const
  ) {
    const { ctx } = mockCtx([{ status, body: { error: true, reason, success: false } }]);
    const res = await apiKey.test!({ credential: cred }, ctx);
    assertEquals(res.ok, false);
    assert(res.message?.includes(needle) && res.message.includes(reason));
    assert(!res.message?.includes("SECRET-TOKEN"));
  }
});

Deno.test("api-key: 429, 5xx and a missing token get distinct messages", async () => {
  const busy = mockCtx([{ status: 429, body: { error: true, reason: "slow down" } }]);
  assert((await apiKey.test!({ credential: cred }, busy.ctx)).message?.includes("rate-limited"));
  const down = mockCtx([{ status: 503, body: "oops" }]);
  assert((await apiKey.test!({ credential: cred }, down.ctx)).message?.includes("HTTP 503"));
  const none = mockCtx();
  assertEquals((await apiKey.test!({ credential: { apiKey: " " } }, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);
});
