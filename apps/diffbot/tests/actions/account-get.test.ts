import { assert, assertEquals } from "@std/assert";
import action from "../../actions/account-get.ts";
import { mockCtx, run } from "../_helpers.ts";

const ACCOUNT = {
  name: "Diffy",
  email: "a@b.co",
  plan: "startup",
  planCredits: 250000,
  status: "active",
  created: "2020-04-22",
  token: "SECRETTOKEN",
  childTokens: ["CHILDSECRET1", "CHILDSECRET2"],
  usage: [{ date: "2022-05-04", credits: 258, extractions: 8 }, {
    date: "2022-05-03",
    credits: 1875,
  }],
};

Deno.test("account-get: reads /v4/account with the days window", async () => {
  const { ctx, calls } = mockCtx([{ body: ACCOUNT }]);
  const out = await run(action, { days: 7 }, ctx);
  const u = new URL(calls[0].url);
  assertEquals(u.origin + u.pathname, "https://api.diffbot.com/v4/account");
  assertEquals(u.searchParams.get("days"), "7");
  assertEquals(out.plan, "startup");
  assertEquals(out.planCredits, 250000);
  assertEquals(out.creditsInWindow, 2133);
  assertEquals((out.usage as unknown[]).length, 2);
});

Deno.test("account-get: never returns the token or the child tokens the vendor echoes", async () => {
  const { ctx } = mockCtx([{ body: ACCOUNT }]);
  const out = await run(action, {}, ctx);
  const json = JSON.stringify(out);
  assert(!json.includes("SECRETTOKEN") && !json.includes("CHILDSECRET"));
  assertEquals(out.childTokenCount, 2);
  assertEquals("token" in out, false);
  assertEquals("childTokens" in out, false);
});
