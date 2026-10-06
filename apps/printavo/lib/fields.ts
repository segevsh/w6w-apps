/**
 * Selection sets, each limited to fields listed on the matching object page of
 * https://www.printavo.com/docs/api/v2 (Customer, Contact, Quote, Invoice, Task, …).
 */
const ADDRESS = `address1 address2 city stateIso zipCode countryIso`;
const ORDER_ADDRESS = `companyName customerName address1 address2 city stateIso zipCode countryIso`;

export const CUSTOMER_FIELDS = `
  id companyName internalNote orderCount publicUrl resaleNumber salesTax taxExempt
  billingAddress { ${ADDRESS} }
  shippingAddress { ${ADDRESS} }
  primaryContact { id firstName lastName fullName email phone }
  owner { id name }
  timestamps { createdAt updatedAt }
`;

export const CONTACT_FIELDS = `
  id firstName lastName fullName email phone fax orderCount
  customer { id companyName }
  timestamps { createdAt updatedAt }
`;

const ORDER_CORE = `
  id visualId nickname visualPoNumber tags publicUrl url
  total subtotal totalUntaxed salesTaxAmount discountAmount amountPaid amountOutstanding paidInFull
  totalQuantity createdAt invoiceAt dueAt customerDueAt paymentDueAt startAt
  status { id name type color position }
  contact { id fullName email customer { id companyName } }
  owner { id name }
  timestamps { createdAt updatedAt }
`;

const ORDER_DETAIL = `
  ${ORDER_CORE}
  customerNote productionNote discount discountAsPercentage salesTax
  publicPdf workorderUrl packingSlipUrl
  billingAddress { ${ORDER_ADDRESS} }
  shippingAddress { ${ORDER_ADDRESS} }
`;

/** Quote/Invoice objects (they share every field above). */
export const ORDER_FIELDS = ORDER_CORE;
export const ORDER_DETAIL_FIELDS = ORDER_DETAIL;

/** `OrderUnion` (Quote | Invoice) needs an inline fragment per member type. */
export const orderUnion = (fields: string) => `
  __typename
  ... on Quote { ${fields} }
  ... on Invoice { ${fields} }
`;

export const TASK_FIELDS = `
  id name completed completedAt dueAt
  assignedTo { id name }
  completedBy { id name }
  taskable {
    __typename
    ... on Quote { id visualId }
    ... on Invoice { id visualId }
    ... on Customer { id companyName }
  }
  timestamps { createdAt updatedAt }
`;

export const INQUIRY_FIELDS = `
  id name email phone request unread
  timestamps { createdAt updatedAt }
`;

export const STATUS_FIELDS = `id name type color position`;

export const PAYMENT_FIELDS = `
  id amount category description processing source transactionDate
  timestamps { createdAt updatedAt }
`;

export const PRODUCT_FIELDS = `id brand color description itemNumber`;

export const PAGE_INFO = `pageInfo { hasNextPage endCursor }`;
