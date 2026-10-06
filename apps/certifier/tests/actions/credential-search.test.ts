import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/credential-search.ts";
import { CREDENTIAL, mockCtx, page, pathOf } from "../_helpers.ts";

Deno.test("credential-search: POST /v1/credentials/search with filter, sort, cursor and limit", async () => {
  const { ctx, calls } = mockCtx([{ body: page([CREDENTIAL]) }]);
  const filter = { AND: [{ status: { equals: "issued" } }] };
  const out = await action.execute({
    filter: JSON.stringify(filter),
    sortProperty: "createdAt",
    sortOrder: "asc",
    cursor: "C",
    limit: 10,
  }, ctx) as { data: unknown[] };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/credentials/search");
  assertEquals(JSON.parse(calls[0].body!), {
    filter,
    sort: { property: "createdAt", order: "asc" },
    cursor: "C",
    limit: 10,
  });
  assertEquals(out.data.length, 1);
});

Deno.test("credential-search: sort order defaults to desc, because the API wants both fields", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await action.execute({ sortProperty: "issueDate" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { sort: { property: "issueDate", order: "desc" } });
});

Deno.test("credential-search: empty input sends an empty object; bad filter and orphan order fail early", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await action.execute({}, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
  await assertRejects(
    async () => await action.execute({ filter: "{" }, ctx),
    Error,
    "not valid JSON",
  );
  await assertRejects(
    async () => await action.execute({ sortOrder: "asc" }, ctx),
    Error,
    "sortProperty",
  );
});
