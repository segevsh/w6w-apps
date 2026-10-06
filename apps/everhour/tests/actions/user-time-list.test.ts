import { assertEquals, assertRejects } from "@std/assert";
import userTimeList from "../../actions/user-time-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-time-list: GET /users/{userId}/time with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ "id": 1 }, { "id": 2 }] }]);
  const out = await userTimeList.execute({ "userId": 89, "from": "2018-01-01", "limit": 2 }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/users/89/time");
  assertEquals(queryOf(calls[0].url), { "from": "2018-01-01", "limit": "2" });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "items": [{ "id": 1 }, { "id": 2 }], "count": 2, "nextPage": 2 });
});

Deno.test("user-time-list: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        userTimeList.execute({ "userId": 89, "from": "2018-01-01", "limit": 2 }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("user-time-list: declares search", () => {
  assertEquals(userTimeList.type, "search");
});
