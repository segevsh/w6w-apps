// deno-lint-ignore-file no-explicit-any
import { assertEquals, assertRejects } from "@std/assert";
import contactUpdate from "../actions/contact-update.ts";
import contactCreate from "../actions/contact-create.ts";
import contactBatchCreate from "../actions/contact-batch-create.ts";
import contactBatchUpdate from "../actions/contact-batch-update.ts";
import contactMessageSend from "../actions/contact-message-send.ts";
import ticketGet from "../actions/ticket-get.ts";
import ticketUpdate from "../actions/ticket-update.ts";
import { jsonBody, mockCtx } from "./_helpers.ts";
import { toProperties } from "../lib/client.ts";

const run = (a: any, input: unknown, ctx: any) => a.execute(input, ctx);

Deno.test("validation: bad input is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => run(contactUpdate, { contact_id: "u-1" }, ctx),
    Error,
    "Nothing to update",
  );
  await assertRejects(() => run(contactCreate, { distinct_id: " " }, ctx), Error, "distinct_id");
  await assertRejects(() => run(contactBatchCreate, { contacts: [] }, ctx), Error, "1-100");
  await assertRejects(
    () => run(contactBatchCreate, { contacts: [{ email: "a" }] }, ctx),
    Error,
    "distinct_id",
  );
  await assertRejects(
    () => run(contactBatchUpdate, { contacts: [{ phone: "1" }] }, ctx),
    Error,
    "id",
  );
  await assertRejects(
    () => run(contactMessageSend, { contact_id: "u", message: "" }, ctx),
    Error,
    "1-5000",
  );
  await assertRejects(() => run(ticketGet, { ticket_id: "abc" }, ctx), Error, "positive integer");
  await assertRejects(() => run(ticketUpdate, { ticket_id: 1 }, ctx), Error, "Nothing to update");
  await assertRejects(
    () => run(ticketUpdate, { ticket_id: 1, assigned_type: "operator" }, ctx),
    Error,
    "together",
  );
  assertEquals(calls.length, 0);
});

Deno.test("ticket-update: unassign sends assigned: null; tag_ids may be a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await run(ticketUpdate, { ticket_id: 7, unassign: true, tag_ids: "[]" }, ctx);
  assertEquals(jsonBody(calls[0]), { assigned: null, tag_ids: [] });
});

Deno.test("toProperties: array, object and JSON string forms; rejects nameless", () => {
  assertEquals(toProperties({ a: "1" }), [{ name: "a", value: "1" }]);
  assertEquals(toProperties('[{"name":"a","value":null}]'), [{ name: "a", value: null }]);
  assertEquals(toProperties(undefined), undefined);
  try {
    toProperties([{ value: "x" }]);
    throw new Error("should have thrown");
  } catch (e) {
    assertEquals((e as Error).message.includes("name"), true);
  }
});

Deno.test("429 surfaces the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { errors: [{ code: "too_many_requests", message: "limit" }] },
  }]);
  const err = await assertRejects(() => run(ticketGet, { ticket_id: 1 }, ctx)) as Error;
  assertEquals(err.message.includes("too_many_requests"), true);
});
