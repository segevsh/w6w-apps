import type { ActionDefinition } from "@w6w/types";
import { LobClient } from "../lib/client.ts";

interface Input {
  zipCode: string;
}

const usZipLookup: ActionDefinition<Input> = {
  key: "us-zip-lookup",
  type: "read",
  resource: "verification",
  title: "Look Up US ZIP Code",
  description:
    "Return the cities, states and counties a 5-digit US ZIP code covers, and the ZIP type.",
  params: [{
    key: "zipCode",
    label: "ZIP code",
    type: "string",
    required: true,
    hint: "5 digits, or ZIP+4.",
  }],
  output: [
    { key: "id", type: "string", label: "Lookup ID" },
    { key: "zip_code", type: "string", label: "ZIP code" },
    { key: "zip_code_type", type: "string", label: "standard | po_box | unique | military" },
    { key: "cities", type: "array", label: "Cities (city, state, county, county_fips, preferred)" },
  ],

  execute(input, ctx) {
    return new LobClient(ctx).json("/us_zip_lookups", {
      method: "POST",
      body: { zip_code: input.zipCode },
    });
  },
};

export default usZipLookup;
