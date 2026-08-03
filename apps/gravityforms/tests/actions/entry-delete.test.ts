import { assert, assertEquals } from "@std/assert";
import { BASE_PATH, DISPLAY, mockCtx, paramsOf } from "../_helpers.ts";
import action from "../../actions/entry-delete.ts";

Deno.test("entry-delete: DELETEs /entries/{id} and trashes by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "159", status: "trash" } }], {
    display: DISPLAY,
  });
  const out = await action.execute!({ entryId: 159 }, ctx) as { status: string };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/entries/159`);
  // No `force` at all — the default is the trash, and sending force=0 would be
  // redundant noise.
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.status, "trash");
});

Deno.test("entry-delete: force=false is still omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ entryId: 159, force: false }, ctx);
  assertEquals(paramsOf(calls).has("force"), false);
});

Deno.test("entry-delete: force=true sends force=1 and returns the deleted envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { deleted: true, previous: { id: "159" } } }], {
    display: DISPLAY,
  });
  const out = await action.execute!({ entryId: 159, force: true }, ctx) as {
    deleted: boolean;
    previous: { id: string };
  };
  assertEquals(paramsOf(calls).get("force"), "1");
  assertEquals(out.deleted, true);
  assertEquals(out.previous.id, "159");
});

Deno.test("entry-delete: logs the force flag it actually used", async () => {
  const { ctx, logs } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ entryId: 159 }, ctx);
  assertEquals((logs[0].data as { force: boolean }).force, false);
});

Deno.test("entry-delete: leaves the same end state, so it is declared idempotent", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assert(action.output);
});
