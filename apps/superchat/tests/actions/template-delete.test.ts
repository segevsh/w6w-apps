import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-delete.ts";

const BASE = "https://api.superchat.com/v1.0";

Deno.test("template-delete: DELETEs the resource and returns its id", async () => {
  const { ctx, calls } = mockCtx([{ "body": { "id": "x_1" } }]);
  const result = await action.execute!({ "templateId": "x_1" } as never, ctx);
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{ "method": "DELETE", "path": "/templates/x_1" }];
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
  assertEquals(result, { "id": "x_1" });
});
