import type { ActionDefinition } from "@w6w/types";
import { RocketReachClient } from "../lib/client.ts";
import { PERSON_FILTERS, runSearch, searchParams } from "../lib/search.ts";
import { SEARCH_OUTPUT_TAIL } from "../lib/profile.ts";

type Input = Record<string, unknown>;

/**
 * `POST /universal/person/search` — Universal Credits accounts only. One credit
 * per page of up to 100 results; page size defaults to 100 (the standard
 * endpoint defaults to 10).
 */
const universalSearchPeople: ActionDefinition<Input> = {
  key: "universal-search-people",
  type: "search",
  resource: "person",
  title: "Universal Search People",
  description: "Universal Credits version of Search People: searches RocketReach's 700M+ " +
    "professionals and charges 1 credit per page of up to 100 results. Page size defaults to 100. " +
    "Use Universal Lookup Person to reveal contact data. Not available on Essentials, Pro or " +
    "Ultimate plans.",
  params: searchParams(PERSON_FILTERS, 100, "people"),
  output: [
    { key: "profiles", type: "array", label: "Matching profiles (id, name, title, employer, ...)" },
    ...SEARCH_OUTPUT_TAIL,
  ],

  async execute(input, ctx) {
    const page = await runSearch(
      new RocketReachClient(ctx),
      "/universal/person/search",
      input,
      PERSON_FILTERS,
    );
    const { items, ...rest } = page;
    return { profiles: items, ...rest };
  },
};

export default universalSearchPeople;
