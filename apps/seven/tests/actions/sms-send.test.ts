import { assert, assertEquals } from "@std/assert";
import smsSend from "../../actions/sms-send.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INPUT = {
  "to": "4917612345678, 4917698765432",
  "text": "hello",
  "from": "Acme",
  "delay": "2026-10-07 10:00:00",
  "flash": true,
  "ttl": 60,
  "label": "L1",
  "performance_tracking": false,
  "foreign_id": "f1",
} as Parameters<typeof smsSend.execute>[0];

Deno.test("sms-send: POST /api/sms with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": "100",
      "total_price": 0.15,
      "balance": 9.5,
      "messages": [{ "id": "1", "success": true }],
    },
  }]);
  const out = await smsSend.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/sms");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), {
    "to": "4917612345678,4917698765432",
    "text": "hello",
    "from": "Acme",
    "delay": "2026-10-07 10:00:00",
    "flash": "1",
    "ttl": "60",
    "label": "L1",
    "performance_tracking": "0",
    "foreign_id": "f1",
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out.success, "100");
});

Deno.test("sms-send: declares type perform and every required param", () => {
  const required = (smsSend.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["text", "to"]);
  assert(["read", "search", "perform"].includes(smsSend.type));
  assertEquals(smsSend.type, "perform");
});

Deno.test("sms-send: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await smsSend.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});

Deno.test("sms-send: code 101 (partial failure) is returned with the per-recipient errors", async () => {
  const { ctx } = mockCtx([{
    body: {
      success: "101",
      messages: [{ id: "1", success: true }, { id: null, success: false, error: "202" }],
    },
  }]);
  const out = await smsSend.execute(INPUT, ctx) as Record<string, unknown>;
  assertEquals(out.success, "101");
  assertEquals((out.messages as Array<{ success: boolean }>).map((m) => m.success), [true, false]);
});

Deno.test("sms-send: a failure code in a 200 body is thrown with its meaning", async () => {
  for (
    const [code, text] of [["500", "too little credit"], ["202", "recipient number is invalid"]]
  ) {
    const { ctx } = mockCtx([{ body: { success: code, messages: [] } }]);
    let message = "";
    try {
      await smsSend.execute(INPUT, ctx);
    } catch (e) {
      message = (e as Error).message;
    }
    assert(message.includes(code) && message.includes(text), message);
  }
});

Deno.test("sms-send: omits unset optional fields and never sends deprecated ones", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: "100" } }]);
  await smsSend.execute({ to: "4917612345678", text: "x" }, ctx);
  assertEquals(
    Object.keys(Object.fromEntries(new URLSearchParams(calls[0].body ?? ""))).sort(),
    ["text", "to"],
  );
});
