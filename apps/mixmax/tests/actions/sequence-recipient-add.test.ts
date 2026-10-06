import { assertEquals } from "@std/assert";
import action from "../../actions/sequence-recipient-add.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("sequence-recipient-add: POST /sequences/s1/recipients", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ email: "a@x.com", status: "added" }] }]);
  const out = await action.execute!(
    { sequenceId: "s1", recipients: "a@x.com, b@x.com", scheduledAt: "false" } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/sequences/s1/recipients");
  assertEquals(JSON.parse(calls[0].body!), {
    recipients: [
      { email: "a@x.com", variables: { email: "a@x.com" } },
      { email: "b@x.com", variables: { email: "b@x.com" } },
    ],
    scheduledAt: false,
  });
  assertEquals(out, { results: [{ email: "a@x.com", status: "added" }] });
});
