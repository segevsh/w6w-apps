import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { mockWorkDriveCtx } from "../_helpers.ts";

Deno.test("user-get: GET /workdrive/api/v1/users/me", async () => {
  const { ctx, calls } = mockWorkDriveCtx([{
    body: { "data": { "id": "r1", "type": "files", "attributes": { "name": "n" } } },
  }]);
  const res = await userGet.execute({} as never, ctx) as unknown as Record<string, unknown>;

  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://www.zohoapis.com");
  assertEquals(url.pathname, "/workdrive/api/v1/users/me");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(res.item, { "id": "r1", "type": "files", "attributes": { "name": "n" } });
});
