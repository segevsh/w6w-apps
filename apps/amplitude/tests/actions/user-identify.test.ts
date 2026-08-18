import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/user-identify.ts";

/** The only form-encoded endpoint in the API. */
Deno.test("user-identify: sends form-encoded JSON to /identify", async () => {
  const { ctx, calls } = mockCtx([ok("success")], { display });
  await action.execute!({
    userId: "user-1071",
    userProperties: '{"plan":"pro"}',
  }, ctx);
  assertEquals(calls[0].url, "https://api2.amplitude.com/identify");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const form = new URLSearchParams(calls[0].body!);
  const identification = JSON.parse(form.get("identification")!);
  assertEquals(identification[0].user_id, "user-1071");
  assertEquals(identification[0].user_properties, { plan: "pro" });
});

/** Short ids identify nobody, because Amplitude removes them. */
Deno.test("user-identify: a short id is refused before sending", async () => {
  const { ctx, calls } = mockCtx([], { display });
  const error = await assertRejects(
    async () => await action.execute!({ userId: "42", userProperties: '{"a":1}' }, ctx),
    Error,
  );
  assert(/would\s+identify nobody/.test(error.message), error.message);
  assertEquals(calls.length, 0);
});

/** `$setOnce` keeps a first value; a plain object is `$set` and rewrites it. */
Deno.test("user-identify: property operations are reported so $set vs $setOnce is visible", async () => {
  const { ctx } = mockCtx([ok("success")], { display });
  const result = await action.execute!({
    userId: "user-1071",
    userProperties: '{"$setOnce":{"signup":"2026-01-01"},"$add":{"logins":1}}',
  }, ctx) as { operations: string[] };
  assertEquals(result.operations.sort(), ["$add", "$setOnce"]);
});

Deno.test("user-identify: a plain object has no operations", async () => {
  const { ctx } = mockCtx([ok("success")], { display });
  const result = await action.execute!({
    userId: "user-1071",
    userProperties: '{"plan":"pro"}',
  }, ctx) as { operations: string[] };
  assertEquals(result.operations, []);
});

Deno.test("user-identify: a device id alone is enough", async () => {
  const { ctx, calls } = mockCtx([ok("success")], { display });
  await action.execute!({ deviceId: "device-abc", userProperties: '{"a":1}' }, ctx);
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(JSON.parse(form.get("identification")!)[0].device_id, "device-abc");
});

Deno.test("user-identify: needs an identifier and some properties", async () => {
  const noId = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ userProperties: '{"a":1}' }, noId.ctx),
    Error,
    "`userId` or a `deviceId`",
  );

  const noProps = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ userId: "user-1071", userProperties: "{}" }, noProps.ctx),
    Error,
    "at least one property",
  );
});

/** User properties are the caller's data. */
Deno.test("user-identify: logs the count and operations, never the values", async () => {
  const { ctx, logs } = mockCtx([ok("success")], { display });
  await action.execute!({
    userId: "user-1071",
    userProperties: '{"email":"ada@example.com"}',
  }, ctx);
  assert(!JSON.stringify(logs).includes("ada@"), JSON.stringify(logs));
  assertEquals(logs[0].data, { propertyCount: 1, operations: [] });
});

Deno.test("user-identify: recommends $setOnce for first values", () => {
  assert(/\$setOnce/.test(action.description!), action.description);
});
