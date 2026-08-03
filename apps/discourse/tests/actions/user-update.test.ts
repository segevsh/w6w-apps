import { assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/user-update.ts";

Deno.test("user-update: PUTs /u/{username}.json and unwraps `user`", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { user: { id: 3, name: "Alicia" } } }]);
  const out = await action.execute({ username: "alice", name: "Alicia" }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/u/alice.json`);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { name: "Alicia" });
  assertEquals(out, { id: 3, name: "Alicia" });
});

Deno.test("user-update: offers only the two fields the schema declares", () => {
  // The published request schema is `{ name, external_ids }` with
  // additionalProperties: false. Discourse accepts more in practice, but
  // guessing at unpublished field names is how an action starts silently
  // discarding input.
  assertEquals(action.params!.map((p) => p.key), ["username", "name", "externalIds"]);
});

Deno.test("user-update: external ids pass through as `external_ids`", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ username: "alice", externalIds: { google_oauth2: "1234" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!).external_ids, { google_oauth2: "1234" });
});
