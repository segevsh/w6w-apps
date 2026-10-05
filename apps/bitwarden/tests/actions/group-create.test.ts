import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/group-create.ts";

const D = { display: { region: "us" } };

Deno.test("group-create: POSTs the group", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      object: "group",
      id: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b",
      name: "Eng",
      externalId: "e1",
    },
  }], D);
  const result = await action.execute({ name: "Eng", externalId: "e1" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.bitwarden.com/public/groups");
  assertEquals(JSON.parse(calls[0].body!), { name: "Eng", externalId: "e1" });
  assertEquals(result.id, "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b");
});
