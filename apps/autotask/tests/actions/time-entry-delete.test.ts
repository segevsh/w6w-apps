import { assert, assertEquals, assertRejects } from "@std/assert";
import timeEntryDelete from "../../actions/time-entry-delete.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://webservices2.autotask.net/atservicesrest/V1.0";
const display = { display: { zone: "2" } };
const run = (a: { execute?: unknown }, input: unknown, ctx: unknown) =>
  (a.execute as (i: unknown, c: unknown) => Promise<Record<string, unknown>>)(input, ctx);

Deno.test("time-entry-delete: DELETEs /TimeEntries/{id}; an API refusal surfaces", async () => {
  const ok = mockCtx([{ body: { itemId: 9 } }], display);
  assertEquals(await run(timeEntryDelete, { id: 9 }, ok.ctx), { deleted: true, id: 9 });
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(ok.calls[0].url, `${BASE}/TimeEntries/9`);
  const bad = mockCtx([{ status: 500, body: { errors: ["entry is billed"] } }], display);
  const err = await assertRejects(() => run(timeEntryDelete, { id: 9 }, bad.ctx));
  assert(String(err).includes("entry is billed"));
  await assertRejects(() => run(timeEntryDelete, { id: -1 }, ok.ctx), Error, "id");
});
