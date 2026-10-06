import { assertEquals } from "@std/assert";
import { mockCtx } from "./_helpers.ts";

const BASE = "https://webservices2.autotask.net/atservicesrest/V1.0";
const display = { display: { zone: "2" } };
export type Act = { execute?: unknown; params?: Array<{ key: string; required?: boolean }> };
export const run = (a: Act, input: unknown, ctx: unknown) =>
  (a.execute as (i: unknown, c: unknown) => Promise<Record<string, unknown>>)(input, ctx);

export type Case = {
  name: string;
  method: "POST" | "PATCH";
  path: string;
  input: Record<string, unknown>;
  body: Record<string, unknown>;
  required: string[];
};

export function writeTests(action: Act, c: Case): void {
  Deno.test(`${c.name}: ${c.method} ${c.path} with exactly the typed body`, async () => {
    const { ctx, calls } = mockCtx([{ body: { itemId: 321 } }], display);
    const out = await run(action, c.input, ctx);
    assertEquals(calls.length, 1);
    assertEquals(calls[0].method, c.method);
    assertEquals(calls[0].url, `${BASE}${c.path}`);
    assertEquals(JSON.parse(calls[0].body!), c.body);
    assertEquals(calls[0].headers["content-type"], "application/json");
    assertEquals(out.itemId, 321);
    assertEquals(out.id, 321);
  });

  Deno.test(`${c.name}: declares exactly the vendor-required params as required`, () => {
    const required = action.params!.filter((p) => p.required).map((p) => p.key).sort();
    assertEquals(required, [...c.required].sort());
  });
}
