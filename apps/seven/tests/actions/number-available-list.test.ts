import { assert, assertEquals } from "@std/assert";
import numberAvailableList from "../../actions/number-available-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "country": "dk", "features_sms": true, "features_voice": false } as Parameters<
  typeof numberAvailableList.execute
>[0];

Deno.test("number-available-list: GET /api/numbers/available with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { "availableNumbers": [{ "number": "4523854818" }] } }]);
  const out = await numberAvailableList.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/numbers/available");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(queryOf(calls[0].url), {
    "country": "DK",
    "features_sms": "1",
    "features_voice": "0",
  });
  assertEquals(calls[0].body, null);
  assertEquals((out.availableNumbers as unknown[]).length, 1);
});

Deno.test("number-available-list: declares type read-or-search and every required param", () => {
  const required = (numberAvailableList.params ?? []).filter((p) => p.required).map((p) => p.key)
    .sort();
  assertEquals(required, []);
  assert(["read", "search", "perform"].includes(numberAvailableList.type));
  assertEquals(numberAvailableList.type === "perform", false);
});

Deno.test("number-available-list: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await numberAvailableList.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
