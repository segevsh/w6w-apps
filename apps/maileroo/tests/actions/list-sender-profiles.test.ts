import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-sender-profiles.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("list-sender-profiles: maps profiles and a null rate limit", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: [
        {
          id: "prf_1",
          name: "Acme login",
          enabled_channels: ["sms", "voice"],
          rate_limit: { max: 5, window_seconds: 60, scope: "destination" },
          created_at: "c",
          updated_at: "u",
        },
        { id: "prf_2", name: "Bare", enabled_channels: ["email"], rate_limit: null },
      ],
    },
  }]);
  const out = await run(action, { limit: 20 }, ctx);
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/verify/sender-profiles?limit=20");
  assertEquals(out.profiles[0].rateLimit, { max: 5, window_seconds: 60, scope: "destination" });
  assertEquals([out.profiles[1].id, out.profiles[1].rateLimit, out.profiles[1].enabledChannels], [
    "prf_2",
    null,
    ["email"],
  ]);
});

Deno.test("list-sender-profiles: a non-array payload is empty; errors throw", async () => {
  assertEquals((await run(action, {}, mockCtx([{ body: { data: null } }]).ctx)).profiles, []);
  await assertRejects(
    () =>
      run(action, {}, mockCtx([{ status: 503, body: { error: { message: "unavailable" } } }]).ctx),
    Error,
    "unavailable",
  );
});
