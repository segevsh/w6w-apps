import testList from "../actions/test-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /v1/tests` through `test-list`, snapshot-diffed. */
export default snapshotTrigger({
  key: "new-test",
  title: "New Test",
  description: "The run gets each compliance test newly added to Vanta.",
  action: testList,
  // `test-list` defaults to the failing tests only; a new test is one of ANY status.
  input: { statusFilter: "" },
  listKey: "tests",
  idKey: "id",
  output: [
    { key: "id", type: "string", label: "Test ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "category", type: "string", label: "Category" },
  ],
  sample: {
    id: "test-1",
    name: "MFA enabled for all users",
    status: "OK",
    category: "ACCOUNT_SETUP",
  },
});
