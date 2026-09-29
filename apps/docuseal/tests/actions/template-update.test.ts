import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-update.ts";

Deno.test("template-update: sends only the fields the caller set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1, updated_at: "now" } }]);
  await action.execute!({ id: 1, name: "New Name" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.docuseal.com/templates/1");
  assertEquals(JSON.parse(calls[0].body!), { name: "New Name" });
});

/** `archived: false` is the documented way back from template-archive. */
Deno.test("template-update: an explicit false survives — it is not dropped as falsy", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1, updated_at: "now" } }]);
  await action.execute!({ id: 1, archived: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { archived: false });
});

Deno.test("template-update: roles parses as a JSON array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1, updated_at: "now" } }]);
  await action.execute!({ id: 1, roles: '["Agent","Customer"]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { roles: ["Agent", "Customer"] });
});

Deno.test("template-update: a missing id fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  let threw = false;
  try {
    await action.execute!({}, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
  assertEquals(calls.length, 0);
});
