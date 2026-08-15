import { assertEquals } from "@std/assert";
import directoryEntriesList from "../../actions/directory-entries-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("directory-entries-list: hits the company directory, not the personal address book", async () => {
  const { ctx, calls } = mockCtx([
    { body: { paging: { page: 1, perPage: 1000 }, records: [{ id: "1", type: "User" }] } },
  ]);
  const out = await directoryEntriesList.execute({}, ctx) as { records: unknown[] };

  assertEquals(pathOf(calls[0].url), "/restapi/v1.0/account/~/directory/entries");
  assertEquals(out.records.length, 1);
});

Deno.test("directory-entries-list: perPage defaults to 1000 with a ceiling of 2000", () => {
  const perPage = directoryEntriesList.params?.find((p) => p.key === "perPage");
  assertEquals(perPage?.default, 1000);
  assertEquals(perPage?.validation?.max, 2000);
});

Deno.test("directory-entries-list: type is single-valued (SearchDirectoryExtensionType, not an array)", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await directoryEntriesList.execute({ type: "User" }, ctx);
  assertEquals(queryOf(calls[0].url).type, "User");
});
