import { assert, assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INPUT = { "id": 12454414 } as Parameters<typeof contactDelete.execute>[0];

Deno.test("contact-delete: DELETE /api/contacts/12454414 with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, headers: {}, body: "" }]);
  const out = await contactDelete.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/contacts/12454414");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.deleted, true);
});

Deno.test("contact-delete: declares type perform and every required param", () => {
  const required = (contactDelete.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["id"]);
  assert(["read", "search", "perform"].includes(contactDelete.type));
  assertEquals(contactDelete.type, "perform");
});

Deno.test("contact-delete: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await contactDelete.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
