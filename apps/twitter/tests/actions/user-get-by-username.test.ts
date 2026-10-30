import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get-by-username.ts";

test("user-get-by-username: GETs /users/by/username/{username}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { id: "1", username: "n8n_io", name: "n8n" } },
  }]);
  const out = await action.execute({ username: "n8n_io" }, ctx);
  assertEquals(calls[0].url, "https://api.x.com/2/users/by/username/n8n_io");
  assertEquals(out, { id: "1", username: "n8n_io", name: "n8n" });
});

test("user-get-by-username: strips a leading @", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { id: "1", username: "n8n_io", name: "n8n" } },
  }]);
  await action.execute({ username: "@n8n_io" }, ctx);
  assertEquals(calls[0].url, "https://api.x.com/2/users/by/username/n8n_io");
});
