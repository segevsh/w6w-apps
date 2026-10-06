import { assert, assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INPUT = { "id": 12876881 } as Parameters<typeof contactGet.execute>[0];

Deno.test("contact-get: GET /api/contacts/12876881 with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "id": 12876881, "properties": { "firstname": "Peter" } },
  }]);
  const out = await contactGet.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/contacts/12876881");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.id, 12876881);
});

Deno.test("contact-get: declares type read-or-search and every required param", () => {
  const required = (contactGet.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["id"]);
  assert(["read", "search", "perform"].includes(contactGet.type));
  assertEquals(contactGet.type === "perform", false);
});

Deno.test("contact-get: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await contactGet.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
