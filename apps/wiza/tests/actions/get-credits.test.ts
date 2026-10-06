import { assertEquals } from "@std/assert";
import action from "../../actions/get-credits.ts";
import { exec, mockCtx } from "../_helpers.ts";

Deno.test("get-credits: GETs /api/meta/credits and unwraps `credits`", async () => {
  const credits = {
    email_credits: "unlimited",
    phone_credits: 100,
    export_credits: 0,
    api_credits: 100,
  };
  const { ctx, calls } = mockCtx([{ body: { credits } }]);
  const out = await exec(action, {}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://wiza.co/api/meta/credits");
  assertEquals(out, credits);
});

Deno.test("get-credits: a 401 fails with the vendor message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { status: { code: 401, message: "Invalid API key." } },
  }]);
  let msg = "";
  try {
    await exec(action, {}, ctx);
  } catch (e) {
    msg = String(e);
  }
  assertEquals(msg.includes("Invalid API key."), true);
});
