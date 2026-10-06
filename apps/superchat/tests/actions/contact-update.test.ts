import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

const BASE = "https://api.superchat.com/v1.0";

Deno.test("contact-update: reads the contact, then PATCHes with unchanged names re-sent", async () => {
  const { ctx, calls } = mockCtx([{
    "body": { "id": "c_1", "first_name": "Ada", "last_name": "Byron", "gender": "female" },
  }, { "body": { "id": "c_1" } }]);
  const result = await action.execute!(
    { "contactId": "c_1", "lastName": "Lovelace" } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{ "method": "GET", "path": "/contacts/c_1" }, {
    "method": "PATCH",
    "path": "/contacts/c_1",
    "body": { "first_name": "Ada", "last_name": "Lovelace", "gender": "female" },
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

Deno.test("contact-update: sends handles and custom attributes only when given", async () => {
  const { ctx, calls } = mockCtx([{
    "body": { "id": "c_1", "first_name": null, "last_name": null, "gender": null },
  }, { "body": { "id": "c_1" } }]);
  const result = await action.execute!(
    {
      "contactId": "c_1",
      "handles": [{ "id": null, "type": "mail", "value": "n@b.co" }],
      "customAttributes": [{ "id": "ca", "value": 1 }],
    } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{ "method": "GET", "path": "/contacts/c_1" }, {
    "method": "PATCH",
    "path": "/contacts/c_1",
    "body": {
      "first_name": null,
      "last_name": null,
      "gender": null,
      "handles": [{ "id": null, "type": "mail", "value": "n@b.co" }],
      "custom_attributes": [{ "id": "ca", "value": 1 }],
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
