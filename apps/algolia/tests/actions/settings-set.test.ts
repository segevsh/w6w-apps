import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/settings-set.ts";

const display = { appId: "APPID" };

Deno.test("settings-set: PUTs the settings to the write host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { taskID: 6 } }], { display });
  await action.execute!({
    indexName: "products",
    settings: '{"searchableAttributes":["name"]}',
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url.split("?")[0], "https://appid.algolia.net/1/indexes/products/settings");
  assertEquals(JSON.parse(calls[0].body!), { searchableAttributes: ["name"] });
});

/** Without this, replicas silently keep serving the old configuration. */
Deno.test("settings-set: forwardToReplicas is only sent when asked for", async () => {
  const off = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ indexName: "p", settings: "{}" }, off.ctx);
  assertEquals(new URL(off.calls[0].url).searchParams.get("forwardToReplicas"), null);

  const on = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ indexName: "p", settings: "{}", forwardToReplicas: true }, on.ctx);
  assertEquals(new URL(on.calls[0].url).searchParams.get("forwardToReplicas"), "true");
});

Deno.test("settings-set: settings are required and must be an object", async () => {
  const missing = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ indexName: "p" }, missing.ctx),
    Error,
    "`settings`",
  );
  const arr = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ indexName: "p", settings: "[]" }, arr.ctx),
    Error,
    "must be a JSON object",
  );
  assertEquals(missing.calls.length + arr.calls.length, 0);
});
