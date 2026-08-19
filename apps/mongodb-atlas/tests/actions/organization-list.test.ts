import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-list.ts";

const page = {
  status: 200,
  body: {
    results: [{ id: "org-1", name: "Acme" }, { id: "org-2", name: "Labs" }],
    totalCount: 2,
  },
};

Deno.test("organization-list: reads the orgs endpoint with page parameters", async () => {
  const { ctx, calls } = mockCtx([page]);
  const result = await action.execute({ itemsPerPage: 50, pageNum: 2 }, ctx) as Record<
    string,
    unknown
  >;
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/atlas/v2/orgs");
  assertEquals(url.searchParams.get("itemsPerPage"), "50");
  assertEquals(url.searchParams.get("pageNum"), "2");
  assertEquals(result.ids, ["org-1", "org-2"]);
  assertEquals(result.totalCount, 2);
});

/** The single most confusing state this credential has. */
Deno.test("organization-list: an empty list is reported as a permissions answer", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { results: [], totalCount: 0 } }]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.hasAccess, false);
  assertEquals(logs[0].level, "warn");
  assert(/not granted a role/.test(logs[0].message), logs[0].message);
});

Deno.test("organization-list: a populated list logs nothing", async () => {
  const { ctx, logs } = mockCtx([page]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.hasAccess, true);
  assertEquals(logs.length, 0);
});

Deno.test("organization-list: the page size is clamped to what Atlas allows", async () => {
  const { ctx, calls } = mockCtx([page]);
  await action.execute({ itemsPerPage: 5000, pageNum: 0 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("itemsPerPage"), "500");
  assertEquals(url.searchParams.get("pageNum"), "1");
});

Deno.test("organization-list: says what an empty result means", () => {
  assert(
    /EMPTY result means the account exists and has been granted no role/
      .test(action.description!),
    action.description,
  );
  assertEquals(action.type, "read");
});
