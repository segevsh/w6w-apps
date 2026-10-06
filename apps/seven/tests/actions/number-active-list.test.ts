import { assert, assertEquals } from "@std/assert";
import numberActiveList from "../../actions/number-active-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INPUT = {} as Parameters<typeof numberActiveList.execute>[0];

Deno.test("number-active-list: GET /api/numbers/active with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "activeNumbers": [{
        "number": "49151",
        "forward_sms_mo": {
          "slack": { "uri": "https://hooks.slack.com/services/T0/B0/XXXX", "enabled": false },
        },
      }],
    },
  }]);
  const out = await numberActiveList.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/numbers/active");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(JSON.stringify(out).includes("hooks.slack.com"), false);
  assertEquals(JSON.stringify(out).includes('"has_uri":true'), true);
});

Deno.test("number-active-list: declares type read-or-search and every required param", () => {
  const required = (numberActiveList.params ?? []).filter((p) => p.required).map((p) => p.key)
    .sort();
  assertEquals(required, []);
  assert(["read", "search", "perform"].includes(numberActiveList.type));
  assertEquals(numberActiveList.type === "perform", false);
});

Deno.test("number-active-list: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await numberActiveList.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
