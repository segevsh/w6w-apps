import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/remove-users.ts";

const MARY = "f1904cf1a9d73a55fa5de0ac823c4403ded71afd4c3248d00bdcd0866552bb79";
const form = (body: string | null) => new URLSearchParams(body ?? "");
const reply = {
  body: { audience_id: "900", session_id: "5", num_received: 1, num_invalid_entries: 0 },
};

Deno.test("remove-users: same call with method=DELETE and the same hashing", async () => {
  const { ctx, calls } = mockCtx([reply]);
  await action.execute({ audienceId: "900", users: [{ email: "mary@example.com" }] }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v25.0/900/users");
  const f = form(calls[0].body);
  assertEquals(f.get("method"), "DELETE");
  assertEquals(JSON.parse(f.get("payload")!).data, [[MARY]]);
});
