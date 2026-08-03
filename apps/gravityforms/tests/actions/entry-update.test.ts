import { assert, assertEquals } from "@std/assert";
import { BASE_PATH, bodyOf, DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-update.ts";

Deno.test("entry-update: PUTs the whole object to /entries/{id}", async () => {
  const entry = { id: "159", form_id: "30", "1.3": "Buzz", is_starred: 1 };
  const { ctx, calls } = mockCtx([{ body: entry }], { display: DISPLAY });
  const out = await action.execute!({ entryId: 159, entry }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/entries/159`);
  assertEquals(bodyOf(calls), entry);
  assertEquals(out, entry);
});

Deno.test("entry-update: sends the object verbatim — no key rewriting", async () => {
  // The endpoint blanks out anything omitted, so the action must not filter,
  // reorder or rename what the caller supplied.
  const entry = { "1.3": "", is_read: 0, payment_status: "Paid", nested: { a: 1 } };
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ entryId: 159, entry }, ctx);
  assertEquals(calls[0].body, JSON.stringify(entry));
});

Deno.test("entry-update: an omitted object still sends a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!(
    { entryId: 159 } as unknown as { entryId: number; entry: Record<string, unknown> },
    ctx,
  );
  assertEquals(calls[0].body, "{}");
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("entry-update: is a replace, so it is declared idempotent", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assert(action.params?.find((p) => p.key === "entry")?.required);
});
