import { assert, assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const INPUT = { "id": 12876881, "firstname": "Marc", "lastname": "Gump" } as Parameters<
  typeof contactUpdate.execute
>[0];

Deno.test("contact-update: PATCH /api/contacts/12876881 with the documented fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "id": 12876881, "properties": { "firstname": "Marc" } },
  }]);
  const out = await contactUpdate.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/contacts/12876881");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), {
    "firstname": "Marc",
    "lastname": "Gump",
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out.id, 12876881);
});

Deno.test("contact-update: declares type perform and every required param", () => {
  const required = (contactUpdate.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["id"]);
  assert(["read", "search", "perform"].includes(contactUpdate.type));
  assertEquals(contactUpdate.type, "perform");
});

Deno.test("contact-update: a refused key (bare code 900 in an HTTP 200) is thrown, not returned", async () => {
  const { ctx } = mockCtx([{ body: '"900"' }]);
  let message = "";
  try {
    await contactUpdate.execute(INPUT, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("900") && message.includes("authentication failed"), message);
});

Deno.test("contact-update: an unset field is not sent, so it is left as it is", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await contactUpdate.execute({ id: 1, city: "Kiel" }, ctx);
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), { city: "Kiel" });
});

Deno.test("contact-update: custom_properties that is not a JSON object is rejected before any call", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await contactUpdate.execute({ id: 1, custom_properties: "[1]" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("must be an object"), message);
  assertEquals(calls.length, 0);
});
