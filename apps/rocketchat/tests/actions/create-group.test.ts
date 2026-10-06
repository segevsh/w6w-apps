import { assertEquals } from "@std/assert";
import a from "../../actions/create-group.ts";
import { BASE, run } from "../_helpers.ts";

Deno.test("create-group: POSTs name, members and flags to groups.create", async () => {
  const { call, json } = await run(a, { name: "secret", members: "alice,bob", readOnly: false }, {
    group: { _id: "G" },
  });
  assertEquals(call.url, `${BASE}/groups.create`);
  assertEquals(json, { name: "secret", members: ["alice", "bob"], readOnly: false });
});

Deno.test("create-group: no members key when none given; custom fields parsed", async () => {
  const { json } = await run(a, { name: "s", customFields: '{"k":"v"}' });
  assertEquals(json, { name: "s", customFields: { k: "v" } });
});
