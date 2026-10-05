import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/collection-list.ts";

const D = { display: { region: "us" } };

Deno.test("collection-list: returns the list and a count", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      object: "list",
      data: [{ object: "collection", id: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b", groups: [] }],
    },
  }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.bitwarden.com/public/collections");
  assertEquals(calls[0].method, "GET");
  assertEquals(result.count, 1);
});
