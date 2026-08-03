import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-teams.ts";

Deno.test("list-teams: GETs /me/joinedTeams", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "t1", displayName: "Contoso" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/joinedTeams");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.value.length, 1);
});

Deno.test("list-teams: sends no OData params — the endpoint supports none", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({}, ctx);
  assertEquals([...new URL(calls[0].url).searchParams.keys()], []);
  // …and none is offered on the form either.
  assertEquals(
    action.params?.map((p) => p.key),
    ["nextLink", "all", "maxPages"],
  );
});

Deno.test("list-teams: replays a nextLink verbatim", async () => {
  const link = "https://graph.microsoft.com/v1.0/me/joinedTeams?$skiptoken=abc";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ nextLink: link }, ctx);
  assertEquals(calls[0].url, link);
});

Deno.test("list-teams: follows every page when `all` is set", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/joinedTeams?p=2";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }] } },
  ]);
  const out = await action.execute({ all: true }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.value.length, 2);
  assertEquals(out.pages, 2);
});

Deno.test("list-teams: honours maxPages and hands back the cursor", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/joinedTeams?p=2";
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "a" }], "@odata.nextLink": next } }]);
  const out = await action.execute({ all: true, maxPages: 1 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(out.nextLink, next);
});
