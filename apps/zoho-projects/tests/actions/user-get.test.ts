import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { mockProjectsCtx } from "../_helpers.ts";

Deno.test("user-get: GET /api/v3/portal/1/users/a%40b.com", async () => {
  const { ctx, calls } = mockProjectsCtx([{ body: { "zpuid": "7", "email": "a@b.com" } }]);
  const res = await userGet.execute(
    { "portalId": "1", "userId": "a@b.com" } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://projects.zoho.com");
  assertEquals(url.pathname, "/api/v3/portal/1/users/a%40b.com");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.item, { "zpuid": "7", "email": "a@b.com" });
});
