import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactUpdateLifecycle from "../../actions/contact-update-lifecycle.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("contact-update-lifecycle: POSTs {name} to the lifecycle/update path", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 0, message: "ok" } }]);
  await contactUpdateLifecycle.execute({ identifier: "id:1", lifecycleName: "Lead" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/contact/id:1/lifecycle/update");
  assertEquals(JSON.parse(calls[0].body!), { name: "Lead" });
});

test("contact-update-lifecycle: an empty stage sends {name: null} to clear it", async () => {
  const { ctx, calls } = mockCtx([{ body: { code: 0, message: "ok" } }]);
  await contactUpdateLifecycle.execute({ identifier: "id:1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: null });
});

test("contact-update-lifecycle: is declared idempotent", () => {
  assertEquals(contactUpdateLifecycle.idempotent, true);
});
