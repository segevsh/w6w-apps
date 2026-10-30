import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-person.ts";

test("update-person: PUTs to /people/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 26443553 } }]);
  await action.execute({ personId: 26443553, details: "This is an update" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/people/26443553");
  assertEquals(JSON.parse(calls[0].body!), { details: "This is an update" });
});

test("update-person: omits untouched fields — Copper's PUT behaves as a PATCH", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ personId: 1, title: "VP" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(body), ["title"]);
});

test("update-person: forwards an explicit null, which is how Copper clears a field", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ personId: 1, title: null, details: null }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { title: null, details: null });
});

test("update-person: does not offer companyId — Copper routes that through Related Items", () => {
  const keys = (action.params ?? []).map((p) => p.key);
  assert(!keys.includes("companyId"), "companyId is not updatable via PUT");
});

test("update-person: is an idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
