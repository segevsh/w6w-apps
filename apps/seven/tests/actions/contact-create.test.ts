import { assert, assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INPUT = {
  "firstname": "Frank",
  "mobile_number": "1-800-759-3000",
  "custom_properties": '{"plan":"pro"}',
} as Parameters<typeof contactCreate.execute>[0];

Deno.test("contact-create: POST /api/contacts with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "id": 12876882, "properties": { "firstname": "Frank" } },
  }]);
  const out = await contactCreate.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/contacts");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), {
    "firstname": "Frank",
    "mobile_number": "1-800-759-3000",
    "plan": "pro",
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out.id, 12876882);
});

Deno.test("contact-create: declares type perform and every required param", () => {
  const required = (contactCreate.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, []);
  assert(["read", "search", "perform"].includes(contactCreate.type));
  assertEquals(contactCreate.type, "perform");
});

Deno.test("contact-create: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await contactCreate.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
