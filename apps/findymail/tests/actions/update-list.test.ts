import { assertEquals } from "@std/assert";
import action from "../../actions/update-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("update-list: PUTs name and isShared to the list path", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "id": 7, "name": "renamed", "shared_with_team": true },
  }]);
  const out = await action.execute!({ "id": 7, "name": "renamed", "isShared": true } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/lists/7");
  assertEquals(calls[0].method, "PUT");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "renamed",
    "isShared": true,
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "id": 7, "name": "renamed", "shared_with_team": true });
});
