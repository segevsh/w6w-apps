import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-sender-profile.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-sender-profile: maps one profile", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        id: "prf_1",
        name: "Acme",
        enabled_channels: ["sms"],
        rate_limit: null,
        created_at: "c",
        updated_at: "u",
      },
    },
  }]);
  const out = await run(action, { senderProfileId: "prf_1" }, ctx);
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/verify/sender-profiles/prf_1");
  assertEquals([out.name, out.enabledChannels, out.updatedAt], ["Acme", ["sms"], "u"]);
});

Deno.test("get-sender-profile: 404 throws", async () => {
  await assertRejects(
    () =>
      run(
        action,
        { senderProfileId: "prf_x" },
        mockCtx([{ status: 404, body: { error: { message: "no profile" } } }]).ctx,
      ),
    Error,
    "no profile",
  );
});
