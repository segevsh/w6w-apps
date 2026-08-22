import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { SEMANTIC_PATCH_CONTENT_TYPE } from "../../lib/client.ts";
import action from "../../actions/flag-toggle.ts";

const conn = {
  display: { instance: "commercial", projectKey: "default", environmentKey: "production" },
};

Deno.test("flag-toggle: sends a semantic patch with the right instruction", async () => {
  const on = mockCtx([{ status: 200, body: { key: "f" } }], conn);
  await action.execute!({ flagKey: "new-checkout", on: "on" }, on.ctx);
  assertEquals(on.calls[0].method, "PATCH");
  assertEquals(on.calls[0].url, "https://app.launchdarkly.com/api/v2/flags/default/new-checkout");
  assertEquals(on.calls[0].headers["content-type"], SEMANTIC_PATCH_CONTENT_TYPE);
  assertEquals(JSON.parse(on.calls[0].body!), {
    environmentKey: "production",
    instructions: [{ kind: "turnFlagOn" }],
  });

  const off = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ flagKey: "f", on: "off" }, off.ctx);
  assertEquals(JSON.parse(off.calls[0].body!).instructions, [{ kind: "turnFlagOff" }]);
});

/** Off is the default: the safer direction for a mistyped call. */
Deno.test("flag-toggle: defaults to off", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ flagKey: "f" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).instructions, [{ kind: "turnFlagOff" }]);
});

/** A flag exists in every environment, so the wrong one succeeds. */
Deno.test("flag-toggle: the environment override reaches the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ flagKey: "f", on: "on", environmentKey: "staging" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).environmentKey, "staging");
});

Deno.test("flag-toggle: a comment is sent when given, for the audit log", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ flagKey: "f", on: "on", comment: "incident 42" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).comment, "incident 42");
});

/** This reaches production users in seconds; the log line may be the record. */
Deno.test("flag-toggle: logs at warn, with the environment and state", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ flagKey: "f", on: "on" }, ctx);
  assertEquals(logs[0].level, "warn");
  assertEquals((logs[0].data as { environment: string; on: boolean }).environment, "production");
});

Deno.test("flag-toggle: a blank key fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`flagKey`");
  assertEquals(calls.length, 0);
});

/** On means the rules apply, not that everyone gets the new behaviour. */
Deno.test("flag-toggle: the option hint says what `on` actually means", () => {
  const param = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "on")!;
  assert(param.hint!.includes("not that everyone"), param.hint);
});
