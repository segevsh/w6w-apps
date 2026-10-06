import type { ActionDefinition } from "@w6w/types";
import { compact, LobClient } from "../lib/client.ts";

interface Input {
  addressPrefix: string;
  city?: string;
  state?: string;
  zipCode?: string;
  geoIpSort?: boolean;
  validOnly?: boolean;
  properCase?: boolean;
}

const usAutocomplete: ActionDefinition<Input> = {
  key: "us-autocomplete",
  type: "search",
  resource: "verification",
  title: "Autocomplete US Address",
  description:
    "Suggest up to 10 US addresses from a street-line prefix. Useful behind a typeahead field; set Only deliverable to drop unverifiable suggestions.",
  params: [
    {
      key: "addressPrefix",
      label: "Address prefix",
      type: "string",
      required: true,
      hint: "The start of the street line, e.g. 185 Ber.",
    },
    { key: "city", label: "City", type: "string", advanced: true },
    { key: "state", label: "State", type: "string", advanced: true },
    { key: "zipCode", label: "ZIP code", type: "string", advanced: true },
    {
      key: "geoIpSort",
      label: "Sort by caller location",
      type: "boolean",
      advanced: true,
      hint: "Uses the IP address Lob sees, which is this host's, not the end user's.",
    },
    { key: "validOnly", label: "Only deliverable suggestions", type: "boolean", advanced: true },
    { key: "properCase", label: "Proper-case the result", type: "boolean", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Autocompletion ID" },
    {
      key: "suggestions",
      type: "array",
      label: "Suggested addresses (primary_line, city, state, zip_code)",
    },
  ],

  execute(input, ctx) {
    return new LobClient(ctx).json("/us_autocompletions", {
      method: "POST",
      query: {
        valid_addresses: input.validOnly === undefined ? undefined : String(input.validOnly),
        case: input.properCase ? "proper" : undefined,
      },
      body: compact({
        address_prefix: input.addressPrefix,
        city: input.city,
        state: input.state,
        zip_code: input.zipCode,
        geo_ip_sort: input.geoIpSort,
      }),
    });
  },
};

export default usAutocomplete;
