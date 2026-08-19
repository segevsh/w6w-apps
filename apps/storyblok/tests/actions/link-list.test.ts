import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/link-list.ts";

const D = { display: { credentialKind: "delivery", region: "eu" } };
const links = {
  status: 200,
  body: {
    links: {
      "1": { id: 1, uuid: "u1", slug: "blog", name: "Blog", is_folder: true, published: false },
      "2": {
        id: 2,
        uuid: "u2",
        slug: "blog/post",
        name: "Post",
        parent_id: 1,
        is_folder: false,
        published: true,
      },
      "3": {
        id: 3,
        uuid: "u3",
        slug: "drafty",
        name: "Drafty",
        is_folder: false,
        published: false,
      },
    },
    cv: 99,
  },
  headers: { total: "3" },
};

/** Without `paginated` the response is an object keyed by id. */
Deno.test("link-list: always paginates, and hands back an array either way", async () => {
  const { ctx, calls } = mockCtx([links], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).searchParams.get("paginated"), "1");
  assertEquals(result.count, 3);
  assert(Array.isArray(result.links), "links must be an array");
});

/** A menu that links to a folder links to nothing. */
Deno.test("link-list: separates folders from pages", async () => {
  const { ctx } = mockCtx([links], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.folders, ["blog"]);
  assertEquals(result.roots, ["blog", "drafty"]);

  const pagesOnly = mockCtx([links], D);
  const withoutFolders = await action.execute({ includeFolders: false }, pagesOnly.ctx) as Record<
    string,
    unknown
  >;
  assertEquals(withoutFolders.count, 2);
});

/** In the tree, and invisible from the published site. */
Deno.test("link-list: names the unpublished entries", async () => {
  const { ctx } = mockCtx([links], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.unpublished, ["drafty"]);
});

Deno.test("link-list: an array response is handled too", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { links: [{ id: 1, slug: "home", is_folder: false, published: true }] },
  }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.count, 1);
  assertEquals(result.slugs, ["home"]);
});

/** This is the cheap call, and the description says why. */
Deno.test("link-list: says listing stories is the expensive way to do this", () => {
  assert(/dragging every story's content/.test(action.description!), action.description);
});
