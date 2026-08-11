import { assert, assertEquals } from "@std/assert";
import listCategories from "../../actions/list-categories.ts";
import { PUBLIC_ENDPOINTS } from "../../lib/client.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const TREE = {
  categories: [
    {
      id: 1,
      name: "Utilities",
      icon: "u.png",
      subcategories: [
        { id: 5, name: "Electricity", icon: "e.png" },
        { id: 48, name: "Cleaning", icon: "c.png" },
      ],
    },
    { id: 2, name: "Food", subcategories: [{ id: 13, name: "Groceries" }] },
  ],
};

Deno.test("list-categories: returns the raw tree", async () => {
  const { ctx, calls } = mockCtx([{ body: TREE }]);
  const out = await listCategories.execute({}, ctx) as { categories: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v3.0/get_categories");
  assertEquals(out.categories.length, 2);
});

/**
 * "When creating expenses, you must use a subcategory, not a parent category."
 * Parent and child ids look identical, so the flattened list is what keeps a
 * workflow from sending `1` (Utilities) and getting an opaque rejection.
 */
Deno.test("list-categories: flattens to usable subcategories, each naming its parent", async () => {
  const { ctx } = mockCtx([{ body: TREE }]);
  const out = await listCategories.execute({}, ctx) as {
    subcategories: Array<
      { id: number; name: string; icon?: string; parent_id: number; parent_name: string }
    >;
  };

  assertEquals(out.subcategories.length, 3);
  assertEquals(out.subcategories[0], {
    id: 5,
    name: "Electricity",
    icon: "e.png",
    parent_id: 1,
    parent_name: "Utilities",
  });
  // The parent ids must NOT appear as usable categories.
  const ids = out.subcategories.map((s) => s.id);
  assert(!ids.includes(1) && !ids.includes(2), "a parent category leaked into the usable list");
});

Deno.test("list-categories: a parent with no subcategories contributes nothing", async () => {
  const { ctx } = mockCtx([{ body: { categories: [{ id: 9, name: "Empty" }] } }]);
  const out = await listCategories.execute({}, ctx) as { subcategories: unknown[] };
  assertEquals(out.subcategories.length, 0);
});

Deno.test("list-categories: is declared as needing no auth, matching the measurement", () => {
  assertEquals(listCategories.requiresAuth, false);
  assert(PUBLIC_ENDPOINTS.includes("/get_categories"), "the public-endpoint list lost this path");
});
