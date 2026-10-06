import { assert, assertEquals, assertRejects } from "@std/assert";
import ticketCreate from "../../actions/ticket-create.ts";
import ticketUpdate from "../../actions/ticket-update.ts";
import contactUpdate from "../../actions/contact-update.ts";
import timeEntryCreate from "../../actions/time-entry-create.ts";
import { mockCtx } from "../_helpers.ts";
import { run } from "../_write_cases.ts";

const display = { display: { zone: "2" } };

Deno.test("write: the free-form `fields` object is merged and typed params win on conflict", async () => {
  const { ctx, calls } = mockCtx([{ body: { itemId: 1 } }], display);
  await run(ticketCreate, {
    companyID: 5,
    title: "Typed",
    status: 1,
    priority: 1,
    fields: '{"title":"Loser","userDefinedFields":[{"name":"X","value":"y"}]}',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Typed",
    companyID: 5,
    status: 1,
    priority: 1,
    userDefinedFields: [{ name: "X", value: "y" }],
  });
});

Deno.test("write: an update with nothing to change, or with a bad id, is refused before any request", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(() => run(ticketUpdate, { id: 9 }, ctx), Error, "nothing to update");
  await assertRejects(
    () => run(contactUpdate, { id: 9, companyID: 4 }, ctx),
    Error,
    "nothing to update",
  );
  await assertRejects(() => run(ticketUpdate, { status: 1 }, ctx), Error, "id");
  await assertRejects(() => run(ticketCreate, { fields: "[1]" }, ctx), Error, "JSON object");
  await assertRejects(() => run(timeEntryCreate, { hoursWorked: "abc" }, ctx), Error, "number");
  assertEquals(calls.length, 0);
});

Deno.test("write: Autotask's 500 errors envelope surfaces as the thrown message", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { errors: ["Priority is required."] } }], display);
  const err = await assertRejects(() =>
    run(ticketCreate, { companyID: 5, title: "x", status: 1, priority: 1 }, ctx)
  );
  assert(String(err).includes("Priority is required."));
});

Deno.test("write: an update keeps the id when the API answers with no itemId", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }], display);
  const out = await run(ticketUpdate, { id: 9, status: 5 }, ctx);
  assertEquals(out.id, 9);
});
