import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "wrapper-list",
  resource: "wrapper",
  title: "List Wrappers",
  description:
    "List wrappers: an email wrapper (header and footer HTML) applied to mass emails. Read-only; ids go into Create Message.",
  path: () => "/wrappers",
});
