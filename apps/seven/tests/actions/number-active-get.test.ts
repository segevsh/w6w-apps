import { assert, assertEquals } from "@std/assert";
import numberActiveGet from "../../actions/number-active-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INPUT = { "number": "+49176123456789" } as Parameters<typeof numberActiveGet.execute>[0];

Deno.test("number-active-get: GET /api/numbers/active/49176123456789 with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "number": "49176123456789",
      "forward_sms_mo": {
        "slack": { "uri": "https://hooks.slack.com/services/T0/B0/XXXX", "enabled": true },
      },
    },
  }]);
  const out = await numberActiveGet.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/numbers/active/49176123456789");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(JSON.stringify(out).includes("hooks.slack.com"), false);
});

Deno.test("number-active-get: declares type read-or-search and every required param", () => {
  const required = (numberActiveGet.params ?? []).filter((p) => p.required).map((p) => p.key)
    .sort();
  assertEquals(required, ["number"]);
  assert(["read", "search", "perform"].includes(numberActiveGet.type));
  assertEquals(numberActiveGet.type === "perform", false);
});

Deno.test("number-active-get: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await numberActiveGet.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
