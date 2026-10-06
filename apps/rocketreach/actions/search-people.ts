import type { ActionDefinition } from "@w6w/types";
import { RocketReachClient } from "../lib/client.ts";
import { PERSON_FILTERS, runSearch, searchParams } from "../lib/search.ts";
import { SEARCH_OUTPUT_TAIL } from "../lib/profile.ts";

type Input = Record<string, unknown>;

/**
 * `POST /person/search`. Returns teasers (name, title, employer, location, a
 * contact-data preview); contact details come from Lookup Person. Page size
 * defaults to 10, `start` is 1-based and capped at 10,000.
 */
const searchPeople: ActionDefinition<Input> = {
  key: "search-people",
  type: "search",
  resource: "person",
  title: "Search People",
  description: "Search RocketReach's 700M+ professionals by title, employer, company domain, " +
    "location, department, seniority and more. Returns profile summaries with a contact preview; " +
    "use Lookup Person to reveal emails and phones. Page with Start. For Universal Credits " +
    "accounts use Universal Search People.",
  params: searchParams(PERSON_FILTERS, 10, "people"),
  output: [
    { key: "profiles", type: "array", label: "Matching profiles (id, name, title, employer, ...)" },
    ...SEARCH_OUTPUT_TAIL,
  ],

  async execute(input, ctx) {
    const page = await runSearch(
      new RocketReachClient(ctx),
      "/person/search",
      input,
      PERSON_FILTERS,
    );
    const { items, ...rest } = page;
    return { profiles: items, ...rest };
  },
};

export default searchPeople;
