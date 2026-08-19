import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-list.ts";

Deno.test("organization-list: reads the one path above the organisation", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { result: [{ id: "org-1", name: "Acme" }] },
  }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.clickhouse.cloud/v1/organizations");
  assertEquals(result.id, "org-1");
  assertEquals(result.name, "Acme");
  assertEquals(result.count, 1);
});

/** A key is created inside one organisation and sees that one. */
Deno.test("organization-list: leaves the single id unset when there is not exactly one", async () => {
  const many = mockCtx([{ status: 200, body: { result: [{ id: "a" }, { id: "b" }] } }]);
  const ambiguous = await action.execute({}, many.ctx) as Record<string, unknown>;
  assertEquals(ambiguous.id, undefined);
  assertEquals(ambiguous.count, 2);

  const none = mockCtx([{ status: 200, body: { result: [] } }]);
  const empty = await action.execute({}, none.ctx) as Record<string, unknown>;
  assertEquals(empty.id, undefined);
  assertEquals(empty.count, 0);
});

Deno.test("organization-list: takes no parameters", () => {
  assertEquals(action.params, []);
  assertEquals(action.type, "read");
});

Deno.test("organization-list: a rejected key surfaces the explanation", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "unauthorized" } }]);
  let message = "";
  try {
    await action.execute({}, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/key ID and a key SECRET/.test(message), message);
});
