import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/refresh-token.ts";

test("Refresh Token sends the refresh grant and returns both rotated tokens", async () => {
  const result = { access_token: "new-access", refresh_token: "new-refresh" };
  const { ctx, calls } = mockCtx([{ body: result }]);
  assertEquals(await action.execute({ refreshToken: "old-refresh" }, ctx), result);
  assertEquals(new URL(calls[0].url).pathname, "/v1/oauth/token");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    grant_type: "refresh_token",
    refresh_token: "old-refresh",
  });
  assertEquals(action.params?.find((p) => p.key === "refreshToken")?.type, "secret");
});
