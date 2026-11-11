import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/store-search.ts";
import { idOf, itemsOf } from "../lib/triggers.ts";

// GET /store?sortBy=newest&limit=20&offset=0 — "Get list of Actors in Store": `sortBy` accepts
// `newest`, which lists the most recently published Actors first.
// https://docs.apify.com/api/v2/store-get
export default pollFromListAction<{ search?: string; category?: string }>({
  key: "new-store-actor",
  title: "New Actor in Apify Store",
  description: "The run gets each Actor newly published in the public Apify Store.",
  action,
  params: [
    { key: "search", label: "Search", type: "string", hint: "Only Actors matching this text." },
    { key: "category", label: "Category", type: "string", hint: "Only this Store category." },
  ],
  input: (params) => ({
    sortBy: "newest",
    search: params.search || undefined,
    category: params.category || undefined,
    limit: 20,
    offset: 0,
  }),
  items: itemsOf,
  idOf,
  output: [
    { key: "id", type: "string", label: "Actor ID" },
    { key: "name", type: "string", label: "Actor name" },
    { key: "username", type: "string", label: "Author" },
    { key: "title", type: "string", label: "Title" },
  ],
  sample: { id: "store-actor-1", name: "web-scraper", username: "apify", title: "Web Scraper" },
  maxPages: 1,
});
