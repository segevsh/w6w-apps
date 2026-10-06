import { listAction } from "../lib/factory.ts";
import type { PageInput } from "../lib/params.ts";

interface Input extends PageInput {
  access?: "public" | "private";
  enabled?: boolean;
}

export default listAction<Input>({
  key: "site-list",
  resource: "site",
  title: "List Sites",
  description: "List the account's member sites.",
  path: "/sites",
  itemsLabel: "Sites",
  params: [
    {
      key: "access",
      label: "Access",
      type: "select",
      options: [
        { value: "public", label: "Public" },
        { value: "private", label: "Private" },
      ],
    },
    {
      key: "enabled",
      label: "Enabled only",
      type: "boolean",
      hint: "Set true or false to filter.",
    },
  ],
  query: (i) => ({
    access: i.access,
    enabled: i.enabled === undefined ? undefined : i.enabled ? "1" : "0",
  }),
});
