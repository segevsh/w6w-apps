import { assert } from "@std/assert";
import type { CallRecord } from "./_helpers.ts";

export const ENDPOINT =
  "https://integrations.expensify.com/Integration-Server/ExpensifyIntegrations";

/** Decode a recorded call into its job description and the other form fields. */
export function sent(call: CallRecord) {
  assert(call.body, "request had no body");
  const form = new URLSearchParams(call.body);
  const jobText = form.get("requestJobDescription");
  assert(jobText, "no requestJobDescription field");
  // deno-lint-ignore no-explicit-any
  const job = JSON.parse(jobText) as Record<string, any>;
  const extra: Record<string, string> = {};
  for (const [k, v] of form) if (k !== "requestJobDescription") extra[k] = v;
  return { job, extra, form };
}

/** Every action's call must be one POST to the single endpoint, with no credential of its own. */
export function assertWire(call: CallRecord) {
  assert(call.url === ENDPOINT, `unexpected url ${call.url}`);
  assert(call.method === "POST");
  assert(call.headers["content-type"] === "application/x-www-form-urlencoded");
  const { job } = sent(call);
  assert(!("credentials" in job), "an action must not write credentials; sign does");
  assert(!("authorization" in call.headers));
}
