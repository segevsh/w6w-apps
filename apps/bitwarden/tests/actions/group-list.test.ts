import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/group-list.ts";

const D = { display: { region: "us" } };

Deno.test("group-list: returns the list and a count", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      object: "list",
      data: [{ id: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b", name: "Eng" }, {
        id: "a1b2c3d4-e5f6-4789-8abc-def012345678",
        name: "Ops",
      }],
    },
  }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.bitwarden.com/public/groups");
  assertEquals(result.count, 2);
});
