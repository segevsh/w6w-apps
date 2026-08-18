import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/flag-list.ts";

const conn = { display: { projectKey: "default" } };

Deno.test("flag-list: reads the project's flags from the items envelope", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [{ key: "f" }] } }], conn);
  assertEquals(await action.execute!({}, ctx), [{ key: "f" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/flags/default");
});

/** Without `env` every flag carries its config for every environment. */
Deno.test("flag-list: the env filter is comma-joined into one parameter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [] } }], conn);
  await action.execute!({ env: "production, staging", tag: "checkout", summary: true }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("env"), "production,staging");
  assertEquals(q.get("tag"), "checkout");
  assertEquals(q.get("summary"), "true");
});

Deno.test("flag-list: archived is opt-in, and omitted when off", async () => {
  const off = mockCtx([{ status: 200, body: { items: [] } }], conn);
  await action.execute!({}, off.ctx);
  assertEquals(new URL(off.calls[0].url).searchParams.get("archived"), null);

  const on = mockCtx([{ status: 200, body: { items: [] } }], conn);
  await action.execute!({ archived: true }, on.ctx);
  assertEquals(new URL(on.calls[0].url).searchParams.get("archived"), "true");
  assert(action.type === "read");
});
