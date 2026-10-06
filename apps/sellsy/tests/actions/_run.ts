import { assert, assertEquals } from "@std/assert";
import type { ActionDefinition } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import { cases } from "./cases.ts";

/** Runs the table row for `action.key` and checks the one request it must make. */
export async function runCase(action: ActionDefinition): Promise<void> {
  const c = cases.find((x) => x.key === action.key);
  assert(c, `no case for ${action.key}`);
  const { ctx, calls } = mockCtx([c.response ?? { status: 200, body: { data: [] } }]);
  const out = await action.execute!(c.input, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, c.method);
  assertEquals(calls[0].url, c.url);
  if (c.body === undefined) assertEquals(calls[0].body, null);
  else assertEquals(JSON.parse(calls[0].body!), c.body);
  assert(c.result in out, `${c.key}: result has no "${c.result}"`);
  // Credentials belong to `sign`, never to an action.
  assertEquals(calls[0].headers["authorization"], undefined);
}
