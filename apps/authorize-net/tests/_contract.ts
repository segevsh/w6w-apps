import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { ActionDefinition } from "@w6w/types";
import { ENDPOINTS } from "../lib/client.ts";
import { mockCtx, OK, reverseKeys } from "./_helpers.ts";
export const reference = JSON.parse(
  readFileSync(new URL("./fixtures/reference-requests.json", import.meta.url), "utf8"),
) as Record<string, Record<string, Record<string, unknown>>>;

export async function checkAction(action: ActionDefinition, request: string) {
  const expected = reference[request];
  const body = expected[request];
  const input = Object.fromEntries(
    Object.entries(body).filter(([key]) => key !== "merchantAuthentication"),
  );
  const { ctx, calls } = mockCtx();
  assert.deepEqual(await action.execute(reverseKeys(input) as Record<string, unknown>, ctx), OK);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, ENDPOINTS.sandbox);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].headers["content-type"], "application/json");
  // String equality is essential: deepEqual does NOT check JSON property order.
  assert.equal(calls[0].body, JSON.stringify(expected));
  assert.ok(!calls[0].unsignedBody.includes("merchantAuthentication"));
  if (action.type === "perform") assert.equal(action.idempotent, false);
}
