import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-folder-create.ts";

const BASE = "https://api.superchat.com/v1.0";

Deno.test("template-folder-create: POSTs the folder with null defaults for the nullable required fields", async () => {
  const { ctx, calls } = mockCtx([{ "body": { "id": "fo_1", "name": "Promo" } }]);
  const result = await action.execute!({ "name": "Promo" } as never, ctx);
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "POST",
    "path": "/template-folders",
    "body": { "name": "Promo", "parent_id": null, "whats_app_business_account_id": null },
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
  assertEquals(result, { "id": "fo_1", "name": "Promo" });
});

Deno.test("template-folder-create: forwards parent and WABA", async () => {
  const { ctx, calls } = mockCtx([{ "body": { "id": "fo_2" } }]);
  const result = await action.execute!(
    { "name": "P", "parentId": "fo_1", "whatsAppBusinessAccountId": "w_1" } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "POST",
    "path": "/template-folders",
    "body": { "name": "P", "parent_id": "fo_1", "whats_app_business_account_id": "w_1" },
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
  assertEquals(result, { "id": "fo_2" });
});
