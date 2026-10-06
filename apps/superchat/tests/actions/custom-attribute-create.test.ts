import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/custom-attribute-create.ts";

const BASE = "https://api.superchat.com/v1.0";

Deno.test("custom-attribute-create: POSTs a plain attribute for the contact resource", async () => {
  const { ctx, calls } = mockCtx([{ "body": { "id": "ca_1", "name": "Plan" } }]);
  const result = await action.execute!(
    { "name": "Plan", "type": "text", "readOnly": true } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "POST",
    "path": "/custom-attributes",
    "body": { "name": "Plan", "type": "text", "resource": "contact", "read_only": true },
  }];
  assertEquals(calls.length, expected.length, "number of requests");
  expected.forEach((want, i) => {
    const url = new URL(calls[i].url);
    assertEquals(url.origin + url.pathname, BASE + want.path);
    assertEquals(calls[i].method, want.method);
    const got: Record<string, string | string[]> = {};
    for (const key of new Set(url.searchParams.keys())) {
      const all = url.searchParams.getAll(key);
      got[key] = all.length > 1 || Array.isArray(want.query?.[key]) ? all : all[0];
    }
    assertEquals(got, want.query ?? {});
    assertEquals(calls[i].body === null ? undefined : JSON.parse(calls[i].body!), want.body);
    assertEquals(calls[i].headers["x-api-key"], undefined, "credentials belong to sign only");
  });
  assertEquals(result, { "id": "ca_1", "name": "Plan" });
});

Deno.test("custom-attribute-create: POSTs option values for a select attribute", async () => {
  const { ctx, calls } = mockCtx([{ "body": { "id": "ca_2" } }]);
  const result = await action.execute!(
    { "name": "Tier", "type": "single_select", "optionValues": ["gold", "silver"] } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "POST",
    "path": "/custom-attributes",
    "body": {
      "name": "Tier",
      "type": "single_select",
      "resource": "contact",
      "option_values": ["gold", "silver"],
    },
  }];
  assertEquals(calls.length, expected.length, "number of requests");
  expected.forEach((want, i) => {
    const url = new URL(calls[i].url);
    assertEquals(url.origin + url.pathname, BASE + want.path);
    assertEquals(calls[i].method, want.method);
    const got: Record<string, string | string[]> = {};
    for (const key of new Set(url.searchParams.keys())) {
      const all = url.searchParams.getAll(key);
      got[key] = all.length > 1 || Array.isArray(want.query?.[key]) ? all : all[0];
    }
    assertEquals(got, want.query ?? {});
    assertEquals(calls[i].body === null ? undefined : JSON.parse(calls[i].body!), want.body);
    assertEquals(calls[i].headers["x-api-key"], undefined, "credentials belong to sign only");
  });
  assertEquals(result, { "id": "ca_2" });
});

Deno.test("custom-attribute-create: a select attribute without options throws", async () => {
  const { ctx, calls } = mockCtx();
  const err = await assertRejects(
    async () => await action.execute!({ "name": "Tier", "type": "multi_select" } as never, ctx),
    Error,
  );
  assert(err.message.toLowerCase().includes("option value"), err.message);
  assertEquals(calls.length, 0, "must fail before any request");
});
