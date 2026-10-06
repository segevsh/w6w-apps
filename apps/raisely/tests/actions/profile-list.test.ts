import { assertEquals } from "@std/assert";
import profileList from "../../actions/profile-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("profile-list: GETs /v3/profiles with every filter and the list params on the query", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ uuid: "1" }], { total: 41 }) }]);
  const out = await profileList.execute({
    "private": true,
    "limit": 5,
    "offset": 10,
    "q": "x",
    "sort": "createdAt",
    "order": "desc",
    "campaign": "spring-appeal",
    "rank": "1",
  }, ctx) as {
    data: unknown[];
    pagination: { total: number };
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v3/profiles");
  assertEquals(queryOf(calls[0].url), {
    "private": "true",
    "limit": "5",
    "offset": "10",
    "q": "x",
    "sort": "createdAt",
    "order": "desc",
    "campaign": "spring-appeal",
    "rank": "1",
  });
  assertEquals(out.data.length, 1);
  assertEquals(out.pagination.total, 41);
});

Deno.test("profile-list: unset filters are omitted, and private=true is asked for by default", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await profileList.execute({ private: true, campaign: "c1" }, ctx);
  assertEquals(queryOf(calls[0].url), { "private": "true", "campaign": "c1" });
});

Deno.test("profile-list: the param default for private is true and the action never signs", () => {
  const p = profileList.params!.find((p) => p.key === "private");
  assertEquals(p?.default, true);
  assertEquals(profileList.type, "read");
});

Deno.test("profile-list: a Raisely error body surfaces its code and detail", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { code: "forbidden", detail: "You are not authorized to do that" },
  }]);
  let message = "";
  try {
    await profileList.execute({ campaign: "c1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Raisely 403"), true, message);
  assertEquals(message.includes("forbidden"), true, message);
});
