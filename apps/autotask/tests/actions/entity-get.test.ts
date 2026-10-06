import { assertEquals, assertRejects } from "@std/assert";
import entityGet from "../../actions/entity-get.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://webservices2.autotask.net/atservicesrest/V1.0";
const display = { display: { zone: "2" } };
const run = (a: { execute?: unknown }, input: unknown, ctx: unknown) =>
  (a.execute as (i: unknown, c: unknown) => Promise<Record<string, unknown>>)(input, ctx);

Deno.test("entity-get: GETs /{Entity}/{id}; a null item is found:false, not an error", async () => {
  const hit = mockCtx([{ body: { item: { id: 7, title: "x" } } }], display);
  assertEquals(await run(entityGet, { entity: "Tickets", id: 7 }, hit.ctx), {
    found: true,
    item: { id: 7, title: "x" },
  });
  assertEquals(hit.calls[0].url, `${BASE}/Tickets/7`);
  const miss = mockCtx([{ body: { item: null } }], display);
  assertEquals(await run(entityGet, { entity: "Tickets", id: 0 }, miss.ctx), {
    found: false,
    item: null,
  });
  await assertRejects(() => run(entityGet, { entity: "Tickets", id: "x" }, miss.ctx), Error, "id");
});
