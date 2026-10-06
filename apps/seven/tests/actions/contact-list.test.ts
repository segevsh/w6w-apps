import { assert, assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "search": "mus",
  "group_id": 7,
  "order_direction": "desc",
  "limit": 50,
  "offset": 1,
} as Parameters<typeof contactList.execute>[0];

Deno.test("contact-list: GET /api/contacts with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "pagingMetadata": { "total": 1 }, "data": [{ "id": 1 }] },
  }]);
  const out = await contactList.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/contacts");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(queryOf(calls[0].url), {
    "search": "mus",
    "group_id": "7",
    "order_direction": "desc",
    "limit": "50",
    "offset": "1",
  });
  assertEquals(calls[0].body, null);
  assertEquals((out.data as unknown[]).length, 1);
});

Deno.test("contact-list: declares type read-or-search and every required param", () => {
  const required = (contactList.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, []);
  assert(["read", "search", "perform"].includes(contactList.type));
  assertEquals(contactList.type === "perform", false);
});

Deno.test("contact-list: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await contactList.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});
