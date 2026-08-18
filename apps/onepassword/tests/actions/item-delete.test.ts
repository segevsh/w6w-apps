import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, eventsDisplay, ok } from "./_shared.ts";
import action from "../../actions/item-delete.ts";

Deno.test("item-delete: archives once the id is typed twice", async () => {
  const { ctx, calls, logs } = mockCtx([ok({})], { display });
  const result = await action.execute!({
    vaultId: "v1",
    itemId: "i1",
    confirmItemId: "i1",
  }, ctx);
  assertEquals(calls[0].url, "https://op.example.com/v1/vaults/v1/items/i1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { deleted: true, itemId: "i1" });
  assertEquals(logs[0].level, "warn");
  assert(/not revoked/.test(logs[0].message), logs[0].message);
});

/** A wrong id deletes somebody else's credential, and nothing notices for hours. */
Deno.test("item-delete: a mismatched confirmation refuses, and nothing is sent", async () => {
  const { ctx, calls } = mockCtx([], { display });
  const error = await assertRejects(
    async () => await action.execute!({ vaultId: "v1", itemId: "i1", confirmItemId: "i2" }, ctx),
    Error,
  );
  assert(/must match the item id exactly/.test(error.message), error.message);
  assert(/surfaces hours later/.test(error.message), error.message);
  assertEquals(calls.length, 0);
});

Deno.test("item-delete: a missing confirmation refuses", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ vaultId: "v1", itemId: "i1" }, ctx),
    Error,
    "confirmItemId",
  );
  assertEquals(calls.length, 0);
});

Deno.test("item-delete: needs a vault and an item", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ itemId: "i1", confirmItemId: "i1" }, ctx),
    Error,
    "`vaultId` is required",
  );
});

Deno.test("item-delete: an Events connection is refused", async () => {
  const { ctx } = mockCtx([], { display: eventsDisplay });
  await assertRejects(
    async () => await action.execute!({ vaultId: "v1", itemId: "i1", confirmItemId: "i1" }, ctx),
    Error,
    "**Connect**",
  );
});

/** Archived is recoverable; the credential itself is not revoked. */
Deno.test("item-delete: says what deletion does and does not do", () => {
  assert(
    /Archive, where an administrator can restore/.test(action.description!),
    action.description,
  );
  assert(/does NOT revoke the credential/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
