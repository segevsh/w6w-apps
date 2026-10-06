import { assertEquals } from "@std/assert";
import a from "../../actions/create-channel.ts";
import { BASE, run } from "../_helpers.ts";

Deno.test("create-channel: POSTs name and splits members on commas", async () => {
  const { call, json } = await run(a, { name: "ops", members: "alice, bob,," }, {
    channel: { _id: "C" },
  });
  assertEquals(call.url, `${BASE}/channels.create`);
  assertEquals(json, { name: "ops", members: ["alice", "bob"] });
});

Deno.test("create-channel: topic goes under extraData; readOnly:false and excludeSelf are kept", async () => {
  const { json } = await run(a, { name: "ops", topic: "Run", readOnly: false, excludeSelf: true });
  assertEquals(json, {
    name: "ops",
    readOnly: false,
    excludeSelf: true,
    extraData: { topic: "Run" },
  });
});
