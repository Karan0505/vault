
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  name: 'name',
  passwordHash: 'passwordHash',
  staffRole: 'staffRole',
  createdAt: 'createdAt'
};

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  description: 'description',
  position: 'position',
  parentId: 'parentId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CollectionScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  description: 'description',
  isAutomatic: 'isAutomatic',
  rules: 'rules',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CollectionProductScalarFieldEnum = {
  collectionId: 'collectionId',
  productId: 'productId',
  position: 'position'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  title: 'title',
  slug: 'slug',
  description: 'description',
  status: 'status',
  categoryId: 'categoryId',
  optionNames: 'optionNames',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductVariantScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  sku: 'sku',
  options: 'options',
  priceAmount: 'priceAmount',
  priceCurrency: 'priceCurrency',
  compareAtAmount: 'compareAtAmount',
  isEnabled: 'isEnabled',
  position: 'position',
  weightGrams: 'weightGrams',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryItemScalarFieldEnum = {
  id: 'id',
  variantId: 'variantId',
  onHand: 'onHand',
  reserved: 'reserved',
  version: 'version',
  lowStockThreshold: 'lowStockThreshold',
  updatedAt: 'updatedAt'
};

exports.Prisma.MediaScalarFieldEnum = {
  id: 'id',
  kind: 'kind',
  url: 'url',
  alt: 'alt',
  width: 'width',
  height: 'height',
  position: 'position',
  productId: 'productId',
  uploadedById: 'uploadedById',
  createdAt: 'createdAt'
};

exports.Prisma.PriceListScalarFieldEnum = {
  id: 'id',
  name: 'name',
  currency: 'currency',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PriceListEntryScalarFieldEnum = {
  id: 'id',
  priceListId: 'priceListId',
  variantId: 'variantId',
  amount: 'amount'
};

exports.Prisma.CartScalarFieldEnum = {
  id: 'id',
  sessionToken: 'sessionToken',
  userId: 'userId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CartItemScalarFieldEnum = {
  id: 'id',
  cartId: 'cartId',
  variantId: 'variantId',
  quantity: 'quantity',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReservationScalarFieldEnum = {
  id: 'id',
  inventoryItemId: 'inventoryItemId',
  cartId: 'cartId',
  orderId: 'orderId',
  quantity: 'quantity',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  number: 'number',
  status: 'status',
  userId: 'userId',
  email: 'email',
  currency: 'currency',
  subtotalAmount: 'subtotalAmount',
  discountAmount: 'discountAmount',
  shippingAmount: 'shippingAmount',
  taxAmount: 'taxAmount',
  totalAmount: 'totalAmount',
  discountId: 'discountId',
  stripePaymentIntentId: 'stripePaymentIntentId',
  reservationExpiresAt: 'reservationExpiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  variantId: 'variantId',
  titleSnapshot: 'titleSnapshot',
  skuSnapshot: 'skuSnapshot',
  optionsSnapshot: 'optionsSnapshot',
  unitAmount: 'unitAmount',
  quantity: 'quantity',
  lineTotal: 'lineTotal',
  fulfilledQuantity: 'fulfilledQuantity',
  refundedQuantity: 'refundedQuantity'
};

exports.Prisma.RefundScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  amount: 'amount',
  reason: 'reason',
  stripeRefundId: 'stripeRefundId',
  restocked: 'restocked',
  createdAt: 'createdAt'
};

exports.Prisma.RefundLineItemScalarFieldEnum = {
  id: 'id',
  refundId: 'refundId',
  orderItemId: 'orderItemId',
  quantity: 'quantity'
};

exports.Prisma.DiscountScalarFieldEnum = {
  id: 'id',
  code: 'code',
  type: 'type',
  value: 'value',
  currency: 'currency',
  usageLimit: 'usageLimit',
  perCustomerLimit: 'perCustomerLimit',
  minimumSpend: 'minimumSpend',
  startsAt: 'startsAt',
  expiresAt: 'expiresAt',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DiscountRedemptionScalarFieldEnum = {
  id: 'id',
  discountId: 'discountId',
  userId: 'userId',
  orderId: 'orderId',
  createdAt: 'createdAt'
};

exports.Prisma.StripeEventScalarFieldEnum = {
  id: 'id',
  type: 'type',
  processedAt: 'processedAt'
};

exports.Prisma.FulfillmentScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  trackingNumber: 'trackingNumber',
  carrier: 'carrier',
  createdAt: 'createdAt'
};

exports.Prisma.FulfillmentItemScalarFieldEnum = {
  id: 'id',
  fulfillmentId: 'fulfillmentId',
  orderItemId: 'orderItemId',
  quantity: 'quantity'
};

exports.Prisma.InventoryAdjustmentScalarFieldEnum = {
  id: 'id',
  inventoryItemId: 'inventoryItemId',
  variantId: 'variantId',
  delta: 'delta',
  resultingOnHand: 'resultingOnHand',
  reason: 'reason',
  note: 'note',
  actorUserId: 'actorUserId',
  actorEmail: 'actorEmail',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogEntryScalarFieldEnum = {
  id: 'id',
  actorUserId: 'actorUserId',
  actorEmail: 'actorEmail',
  actorRole: 'actorRole',
  entityType: 'entityType',
  entityId: 'entityId',
  action: 'action',
  before: 'before',
  after: 'after',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.StaffRole = exports.$Enums.StaffRole = {
  admin: 'admin',
  fulfilment: 'fulfilment',
  support: 'support'
};

exports.ProductStatus = exports.$Enums.ProductStatus = {
  draft: 'draft',
  active: 'active',
  archived: 'archived'
};

exports.MediaKind = exports.$Enums.MediaKind = {
  image: 'image',
  video: 'video'
};

exports.OrderStatus = exports.$Enums.OrderStatus = {
  pending: 'pending',
  paid: 'paid',
  fulfilled: 'fulfilled',
  delivered: 'delivered',
  cancelled: 'cancelled',
  refunded: 'refunded'
};

exports.DiscountType = exports.$Enums.DiscountType = {
  percentage: 'percentage',
  fixed_amount: 'fixed_amount',
  free_shipping: 'free_shipping'
};

exports.InventoryAdjustmentReason = exports.$Enums.InventoryAdjustmentReason = {
  received: 'received',
  damaged: 'damaged',
  lost: 'lost',
  returned: 'returned',
  correction: 'correction',
  other: 'other'
};

exports.AuditAction = exports.$Enums.AuditAction = {
  create: 'create',
  update: 'update',
  delete: 'delete',
  transition: 'transition',
  refund: 'refund',
  adjustment: 'adjustment'
};

exports.Prisma.ModelName = {
  User: 'User',
  Category: 'Category',
  Collection: 'Collection',
  CollectionProduct: 'CollectionProduct',
  Product: 'Product',
  ProductVariant: 'ProductVariant',
  InventoryItem: 'InventoryItem',
  Media: 'Media',
  PriceList: 'PriceList',
  PriceListEntry: 'PriceListEntry',
  Cart: 'Cart',
  CartItem: 'CartItem',
  Reservation: 'Reservation',
  Order: 'Order',
  OrderItem: 'OrderItem',
  Refund: 'Refund',
  RefundLineItem: 'RefundLineItem',
  Discount: 'Discount',
  DiscountRedemption: 'DiscountRedemption',
  StripeEvent: 'StripeEvent',
  Fulfillment: 'Fulfillment',
  FulfillmentItem: 'FulfillmentItem',
  InventoryAdjustment: 'InventoryAdjustment',
  AuditLogEntry: 'AuditLogEntry'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
