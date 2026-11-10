import testEntityList from "../actions/test-entity-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /v1/tests/{testId}/entities` through `test-entity-list` for the test the user picks,
 * snapshot-diffed. The vendor lists `entityStatus` FAILING by default
 * (https://developer.vanta.com/reference/manage-vanta, `/tests/{testId}/entities`), so this fires
 * for a resource that newly FAILS the test; the listing has no sort order.
 */
export default snapshotTrigger({
  key: "new-test-entity",
  title: "New Test Entity",
  description: "The run gets each resource that newly starts failing the chosen Vanta test.",
  action: testEntityList,
  listKey: "entities",
  idKey: "id",
  params: [
    {
      key: "testId",
      label: "Test ID",
      type: "string",
      required: true,
      default: "",
      hint: "The Vanta test whose failing resources to watch (from List tests).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Entity ID" },
    { key: "entityStatus", type: "string", label: "Entity status" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "createdDate", type: "string", label: "First failing" },
  ],
  sample: {
    id: "entity-1",
    entityStatus: "FAILING",
    displayName: "example-bucket",
    createdDate: "2026-11-09T00:00:00Z",
  },
});
