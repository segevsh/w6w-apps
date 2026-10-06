import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

const BASE = "https://api.superchat.com/v1.0";

Deno.test("contact-create: POSTs names (null when omitted) and typed handles", async () => {
  const { ctx, calls } = mockCtx([{ "body": { "id": "c_1" } }]);
  const result = await action.execute!(
    {
      "firstName": "Ada",
      "email": "a@b.co",
      "phone": "+491701234567",
      "gender": "female",
    } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "POST",
    "path": "/contacts",
    "body": {
      "first_name": "Ada",
      "last_name": null,
      "gender": "female",
      "handles": [{ "id": null, "type": "mail", "value": "a@b.co" }, {
        "id": null,
        "type": "phone",
        "value": "+491701234567",
      }],
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
  assertEquals(result, { "id": "c_1" });
});

Deno.test("contact-create: forwards custom attributes", async () => {
  const { ctx, calls } = mockCtx([{ "body": { "id": "c_1" } }]);
  const result = await action.execute!(
    { "email": "a@b.co", "customAttributes": [{ "id": "ca_1", "value": "x" }] } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "POST",
    "path": "/contacts",
    "body": {
      "first_name": null,
      "last_name": null,
      "gender": null,
      "handles": [{ "id": null, "type": "mail", "value": "a@b.co" }],
      "custom_attributes": [{ "id": "ca_1", "value": "x" }],
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
  assertEquals(result, { "id": "c_1" });
});

Deno.test("contact-create: refuses a contact with no handle before calling the API", async () => {
  const { ctx, calls } = mockCtx();
  const err = await assertRejects(
    async () => await action.execute!({ "firstName": "Ada" } as never, ctx),
    Error,
  );
  assert(err.message.toLowerCase().includes("email or a phone"), err.message);
  assertEquals(calls.length, 0, "must fail before any request");
});
