import { assertEquals, assertRejects } from "@std/assert";
import ticketNoteList from "../../actions/ticket-note-list.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://webservices2.autotask.net/atservicesrest/V1.0";
const display = { display: { zone: "2" } };
const run = (a: { execute?: unknown }, input: unknown, ctx: unknown) =>
  (a.execute as (i: unknown, c: unknown) => Promise<Record<string, unknown>>)(input, ctx);

Deno.test("ticket-note-list: GETs the ticket's Notes child collection", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: 1 }, { id: 2 }] } }], display);
  const out = await run(ticketNoteList, { ticketID: 55 }, ctx);
  assertEquals(calls[0].url, `${BASE}/Tickets/55/Notes`);
  assertEquals(out.count, 2);
  await assertRejects(() => run(ticketNoteList, { ticketID: 0 }, ctx), Error, "ticketID");
});
