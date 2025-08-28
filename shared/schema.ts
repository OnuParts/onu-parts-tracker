import { pgTable, text, serial, integer, timestamp, boolean, pgEnum, foreignKey, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'technician',
  'student',
  'controller'
]);

export const issueReasonEnum = pgEnum('issue_reason', [
  'production',
  'maintenance',
  'replacement',
  'testing',
  'other'
]);

// Define tables in the correct order to avoid circular references
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default('technician'),
  department: text("department"),
});

export const buildings = pgTable("buildings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  address: text("address"),
  location: text("location"),
  contactPerson: text("contact_person"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at"),
});

// Storage Locations and Shelves
export const storageLocations = pgTable("storage_locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow()
});

export const shelves = pgTable("shelves", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => storageLocations.id),
  name: text("name").notNull(), // Shelf number/identifier
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => {
  return {
    // Create a unique constraint on the combination of locationId and name
    uniqueLocationShelf: uniqueIndex("unique_location_shelf_idx").on(table.locationId, table.name)
  };
});

// Parts table with proper location/shelf relationships
export const parts = pgTable("parts", {
  id: serial("id").primaryKey(),
  partId: text("part_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  quantity: integer("quantity").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(10),
  unitCost: text("unit_cost"),
  // The location is stored both as text and as foreign keys
  location: text("location"), // Text location for backward compatibility
  // Added proper foreign key relationships to locations and shelves
  locationId: integer("location_id").references(() => storageLocations.id),
  shelfId: integer("shelf_id").references(() => shelves.id),
  category: text("category"),
  supplier: text("supplier"),
  lastRestockDate: timestamp("last_restock_date"),
});

// Barcode mappings table for linking multiple barcodes to a single part
export const partBarcodes = pgTable("part_barcodes", {
  id: serial("id").primaryKey(),
  partId: integer("part_id").notNull().references(() => parts.id),
  barcode: text("barcode").notNull().unique(),
  supplier: text("supplier"), // Which supplier uses this barcode
  isPrimary: boolean("is_primary").notNull().default(false), // Mark one as primary
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const partsIssuance = pgTable("parts_issuance", {
  id: serial("id").primaryKey(),
  partId: integer("part_id").notNull().references(() => parts.id),
  quantity: integer("quantity").notNull(),
  issuedTo: text("issued_to").notNull(),
  reason: issueReasonEnum("reason").notNull(),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  issuedById: integer("issued_by"), // Column name in DB is issued_by
  notes: text("notes"),
  department: text("department"),
  projectCode: text("project_code"),
  buildingId: integer("building_id").references(() => buildings.id),
  costCenter: text("cost_center"),
});

// Archive table for charge-outs that are no longer active but need to be preserved for reporting
export const archivedPartsIssuance = pgTable("archived_parts_issuance", {
  id: serial("id").primaryKey(),
  originalId: integer("original_id"), // Original ID from the parts_issuance table
  partId: integer("part_id").notNull(), // Not a foreign key to allow part deletions
  partNumber: text("part_number").notNull(), // Store the part number for reporting
  partName: text("part_name").notNull(), // Store the part name for reporting
  quantity: integer("quantity").notNull(),
  issuedTo: text("issued_to").notNull(),
  reason: issueReasonEnum("reason").notNull(),
  issuedAt: timestamp("issued_at").notNull(),
  issuedById: integer("issued_by_id"),
  issuedByName: text("issued_by_name"), // Store the name for reporting
  notes: text("notes"),
  department: text("department"),
  projectCode: text("project_code"),
  unitCost: text("unit_cost"), // Store the unit cost at time of issuance
  archivedAt: timestamp("archived_at").notNull().defaultNow(),
  buildingName: text("building_name"), // Store building info at time of archiving
  costCenterName: text("cost_center_name"), // Store cost center info
  costCenterCode: text("cost_center_code"), // Store cost center code
});

// Zod schemas for all tables
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertBuildingSchema = createInsertSchema(buildings).omit({
  id: true,
});

export const insertStorageLocationSchema = createInsertSchema(storageLocations).omit({
  id: true,
  createdAt: true,
});

export const insertShelfSchema = createInsertSchema(shelves).omit({
  id: true,
  createdAt: true,
});

// Create base schema from parts table
const baseInsertPartSchema = createInsertSchema(parts).omit({
  id: true,
});

// Extend the schema to ensure unitCost is handled as a string
export const insertPartSchema = baseInsertPartSchema.extend({
  unitCost: z.string().nullable().optional(),
});

export const insertPartsIssuanceSchema = createInsertSchema(partsIssuance).omit({
  id: true,
  issuedAt: true,
});

// Schema for bulk issuance - allows multiple parts to be issued at once
export const bulkPartsIssuanceSchema = z.object({
  parts: z.array(z.object({
    partId: z.number(),
    quantity: z.number().positive("Quantity must be greater than 0"),
  })),
  building: z.string().min(1, "Building is required"),
  issuedTo: z.string().min(1, "Issued To is required"),
  reason: z.enum(["production", "maintenance", "replacement", "testing", "other"]),
  // CRITICAL FIX: Accept string or Date for issuedAt to handle various date formats from the client
  issuedAt: z.union([z.string(), z.date()]).optional().default(() => new Date()),
  costCenter: z.string().optional(),
  notes: z.string().optional(),
});

// Types for all tables
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Building = typeof buildings.$inferSelect;
export type InsertBuilding = z.infer<typeof insertBuildingSchema>;

export type StorageLocation = typeof storageLocations.$inferSelect;
export type InsertStorageLocation = z.infer<typeof insertStorageLocationSchema>;

export type Shelf = typeof shelves.$inferSelect;
export type InsertShelf = z.infer<typeof insertShelfSchema>;

// No need for virtual fields anymore as they're now part of the database schema
export type Part = typeof parts.$inferSelect;
export type InsertPart = z.infer<typeof insertPartSchema>;

export type PartsIssuance = typeof partsIssuance.$inferSelect;
export type InsertPartsIssuance = z.infer<typeof insertPartsIssuanceSchema>;

// Archive types
export const insertArchivedPartsIssuanceSchema = createInsertSchema(archivedPartsIssuance).omit({
  id: true,
  archivedAt: true,
});

export type ArchivedPartsIssuance = typeof archivedPartsIssuance.$inferSelect;
export type InsertArchivedPartsIssuance = z.infer<typeof insertArchivedPartsIssuanceSchema>;

// Type for archived parts issuance UI display
export type ArchivedPartsIssuanceWithDetails = {
  id: number;
  originalId: number | null;
  partId: number;
  partNumber: string;
  partName: string;
  quantity: number;
  issuedTo: string;
  reason: "production" | "maintenance" | "replacement" | "testing" | "other";
  issuedAt: Date;
  issuedById: number | null;
  issuedByName: string | null;
  notes: string | null;
  department: string | null;
  projectCode: string | null;
  unitCost: string | null;
  archivedAt: Date;
  buildingName: string | null;
  costCenterName: string | null;
  costCenterCode: string | null;
  extendedPrice?: number;
};

// Extended types for UI
export type PartWithAvailability = {
  id: number;
  partId: string;
  name: string;
  description: string | null;
  quantity: number;
  reorderLevel: number;
  unitCost: number | null;
  // Now include proper location fields
  location: string | null;
  locationId: number | null;
  shelfId: number | null;
  category: string | null;
  supplier: string | null;
  lastRestockDate: Date | null;
  availability: 'low' | 'medium' | 'high';
};

export type PartsIssuanceWithDetails = {
  id: number;
  partId: number;
  quantity: number;
  issuedTo: string;
  reason: "production" | "maintenance" | "replacement" | "testing" | "other";
  issuedAt: Date;
  issuedById: number | null;
  notes: string | null;
  department: string | null;
  projectCode: string | null;
  part: Part;
  issuedBy?: User;
  // These match the actual database fields
  buildingId?: number | null;
  costCenter?: string | null;
  // Additional fields for the enhanced UI
  building?: string;
  buildingName?: string;
  costCenterName?: string;
  costCenterCode?: string;
  extendedPrice?: number;
};

// Alias for Parts Charge-Out to maintain backward compatibility during transition
export type PartsChargeOutWithDetails = PartsIssuanceWithDetails;

// Parts to Count Assignments
export const partsToCount = pgTable("parts_to_count", {
  id: serial("id").primaryKey(),
  partId: integer("part_id").notNull().references(() => parts.id),
  assignedById: integer("assigned_by_id").references(() => users.id),
  status: text("status").notNull().default('pending'), // pending, completed
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

export const insertPartsToCountSchema = createInsertSchema(partsToCount).omit({
  id: true,
  assignedAt: true,
  completedAt: true,
});

export type PartsToCount = typeof partsToCount.$inferSelect;
export type InsertPartsToCount = z.infer<typeof insertPartsToCountSchema>;

export type PartsToCountWithDetails = PartsToCount & {
  part: Part;
  assignedBy?: User;
};

// Parts Pickup System - tracks parts that have arrived but not yet added to inventory
export const pickupStatusEnum = pgEnum('pickup_status', [
  'pending',  // Waiting for technician pickup
  'completed' // Technician has acknowledged receipt
]);

export const partsPickup = pgTable("parts_pickup", {
  id: serial("id").primaryKey(),
  partName: text("part_name").notNull(), // Name of the part that arrived
  partNumber: text("part_number"), // Optional part number/SKU from supplier
  quantity: integer("quantity").notNull().default(1),
  supplier: text("supplier"), // Where the part came from
  buildingId: integer("building_id").references(() => buildings.id), // Which building it's for
  addedById: integer("added_by_id").references(() => users.id), // Admin/student who added the entry
  addedAt: timestamp("added_at").notNull().defaultNow(), // When it was recorded as arrived
  pickedUpById: integer("picked_up_by_id").references(() => users.id), // Technician who picked it up
  pickedUpAt: timestamp("picked_up_at"), // When it was picked up
  status: pickupStatusEnum("status").notNull().default('pending'),
  notes: text("notes"), // Any special instructions or details
  trackingNumber: text("tracking_number"), // For tracking deliveries
  poNumber: text("po_number"), // Purchase order reference
  pickupCode: text("pickup_code"), // Random 4-digit code for physical matching
});

export const insertPartsPickupSchema = createInsertSchema(partsPickup).omit({
  id: true,
  addedAt: true,
  pickedUpAt: true,
  pickedUpById: true,
  status: true,
  pickupCode: true,  // Omit pickup code so server can generate it
});

export type PartsPickup = typeof partsPickup.$inferSelect;
export type InsertPartsPickup = z.infer<typeof insertPartsPickupSchema>;

export type PartsPickupWithDetails = PartsPickup & {
  building?: Building;
  addedBy?: User;
  pickedUpBy?: User;
};

// Tools SignOut System
export const toolStatusEnum = pgEnum('tool_status', [
  'checked_out',  // Tool is currently checked out
  'returned',     // Tool has been returned
  'damaged',      // Tool was returned but is damaged
  'missing'       // Tool is missing/not returned
]);

// Table for permanent tool records
export const tools = pgTable("tools", {
  id: serial("id").primaryKey(),
  toolNumber: integer("tool_number").notNull().unique(),  // Permanent sequential identifier
  toolName: text("tool_name").notNull(),                 // Name/description of the tool
  notes: text("notes"),                                  // Any notes about the tool
  createdAt: timestamp("created_at").notNull().defaultNow(),
  active: boolean("active").notNull().default(true),     // If false, tool is retired/removed
});

// Table for tracking tool sign-outs and returns
export const toolSignouts = pgTable("tool_signouts", {
  id: serial("id").primaryKey(),
  toolId: integer("tool_id").notNull().references(() => tools.id), // References the permanent tool
  technicianId: integer("technician_id").notNull().references(() => users.id), // Technician who checked out the tool
  signedOutAt: timestamp("signed_out_at").notNull().defaultNow(), // When the tool was checked out
  returnedAt: timestamp("returned_at"),          // When the tool was returned (if it was)
  status: toolStatusEnum("status").notNull().default('checked_out'),
  condition: text("condition"),                  // Condition upon return
  notes: text("notes"),                          // Any notes about the signout
});

// Schema for adding a new permanent tool
export const insertToolSchema = createInsertSchema(tools).omit({
  id: true,
  toolNumber: true, // System will generate the next number
  createdAt: true,
});

// Schema for signing out a tool
export const insertToolSignoutSchema = createInsertSchema(toolSignouts).omit({
  id: true,
  returnedAt: true,
});

// Types for all tool-related operations
export type Tool = typeof tools.$inferSelect;
export type InsertTool = z.infer<typeof insertToolSchema>;

export type ToolSignout = typeof toolSignouts.$inferSelect;
export type InsertToolSignout = z.infer<typeof insertToolSignoutSchema>;

// Extended types with related entity data
export type ToolWithStatus = Tool & {
  status?: string;
  technicianId?: number;
  technicianName?: string;
  signoutId?: number;
  signedOutAt?: Date;
};

export type ToolSignoutWithDetails = ToolSignout & {
  technician?: User;
  tool?: Tool;
};

// Cost Centers - for Deliveries System
export const costCenters = pgTable("cost_centers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertCostCenterSchema = createInsertSchema(costCenters).omit({
  id: true,
  createdAt: true,
});

export type CostCenter = typeof costCenters.$inferSelect;
export type InsertCostCenter = z.infer<typeof insertCostCenterSchema>;

// Staff members - for Deliveries System
export const staffMembers = pgTable("staff_members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  buildingId: integer("building_id").references(() => buildings.id),
  costCenterId: integer("cost_center_id").references(() => costCenters.id),
  email: text("email"),
  phone: text("phone"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertStaffMemberSchema = createInsertSchema(staffMembers).omit({
  id: true,
  createdAt: true,
});

export type StaffMember = typeof staffMembers.$inferSelect;
export type InsertStaffMember = z.infer<typeof insertStaffMemberSchema>;

// Extended types with relations
export type StaffMemberWithRelations = StaffMember & {
  building?: typeof buildings.$inferSelect;
  costCenter?: typeof costCenters.$inferSelect;
};

// Parts Delivery records
// Enum for delivery status
export const deliveryStatusEnum = pgEnum('delivery_status', [
  'pending',     // Delivery recorded but not yet signed/confirmed
  'delivered',   // Delivery signed and confirmed
  'cancelled'    // Delivery was cancelled
]);

export const partsDelivery = pgTable("parts_delivery", {
  id: serial("id").primaryKey(),
  partId: integer("part_id").notNull().references(() => parts.id),
  quantity: integer("quantity").notNull(),
  staffMemberId: integer("staff_member_id").notNull().references(() => staffMembers.id),
  costCenterId: integer("cost_center_id").references(() => costCenters.id),
  deliveredAt: timestamp("delivered_at").notNull().defaultNow(),
  deliveredById: integer("delivered_by_id").references(() => users.id),
  notes: text("notes"),
  projectCode: text("project_code"),
  buildingId: integer("building_id").references(() => buildings.id),
  unitCost: text("unit_cost"), // Store the actual unit cost at time of delivery
  signature: text("signature"), // Store signature as SVG/base64 data
  status: deliveryStatusEnum("status").notNull().default('pending'),
  confirmedAt: timestamp("confirmed_at"), // When delivery was confirmed/signed
});

export const insertPartsDeliverySchema = createInsertSchema(partsDelivery).omit({
  id: true,
  deliveredAt: true,
  unitCost: true, // Omit unitCost as it will be populated from the part's cost
  signature: true, // Signature will be added later when confirming delivery
  confirmedAt: true, // Will be set when delivery is confirmed
  status: true, // Default to pending
});

// Create update schema for parts delivery
// Create update schema with custom handling for deliveredAt
export const updatePartsDeliverySchema = createInsertSchema(partsDelivery)
  .omit({
    id: true,
    deliveredAt: true,  // Omit deliveredAt so we can customize it
    unitCost: true      // Omit unitCost as it's handled separately
  })
  .extend({
    // Allow string (ISO date) or Date objects for deliveredAt
    deliveredAt: z.union([z.string(), z.date()]).optional(),
    unitCost: z.string().optional(), // Allow updating unitCost if needed
    signature: z.string().optional(), // Allow adding signature data
    status: z.enum(['pending', 'delivered', 'cancelled']).optional(),
    confirmedAt: z.union([z.string(), z.date()]).optional(),
  })
  .partial();

export type PartsDelivery = typeof partsDelivery.$inferSelect;
export type InsertPartsDelivery = z.infer<typeof insertPartsDeliverySchema>;
export type UpdatePartsDelivery = z.infer<typeof updatePartsDeliverySchema>;

// Extended types for UI
export type PartsDeliveryWithDetails = PartsDelivery & {
  part: Part;
  staffMember: StaffMember;
  costCenter?: CostCenter;
  building?: Building;
  deliveredBy?: User;
  signatureUrl?: string; // For frontend display of signature
};

// Barcode mappings - schemas and types
export const insertPartBarcodeSchema = createInsertSchema(partBarcodes).omit({
  id: true,
  createdAt: true,
});

export type PartBarcode = typeof partBarcodes.$inferSelect;
export type InsertPartBarcode = z.infer<typeof insertPartBarcodeSchema>;

// Extended type with part information
export type PartBarcodeWithPart = PartBarcode & {
  part: Part;
};

// Delivery Requests - for public request form
export const deliveryRequestStatusEnum = pgEnum('delivery_request_status', [
  'pending',    // Request submitted, waiting for approval
  'approved',   // Request approved, ready for fulfillment
  'fulfilled',  // Request completed and items delivered
  'rejected'    // Request rejected
]);

export const deliveryRequests = pgTable("delivery_requests", {
  id: serial("id").primaryKey(),
  requesterName: text("requester_name").notNull(),
  roomNumber: text("room_number").notNull(),
  buildingId: integer("building_id").references(() => buildings.id),
  costCenterId: integer("cost_center_id").references(() => costCenters.id),
  notes: text("notes"),
  status: text("status").notNull().default('pending'), // Use text to match existing DB
  requestDate: timestamp("request_date").notNull().defaultNow(),
  fulfilledDate: timestamp("fulfilled_date"),
  fulfilledBy: integer("fulfilled_by").references(() => users.id),
});

export const deliveryRequestItems = pgTable("delivery_request_items", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => deliveryRequests.id),
  partId: text("part_id").notNull(), // Store part_id directly since these are from the parts table
  quantity: integer("quantity").notNull(),
  notes: text("notes"),
});

export const insertDeliveryRequestSchema = createInsertSchema(deliveryRequests).omit({
  id: true,
  requestDate: true,
  fulfilledDate: true,
  status: true,
});

export const insertDeliveryRequestItemSchema = createInsertSchema(deliveryRequestItems).omit({
  id: true,
});

export type DeliveryRequest = typeof deliveryRequests.$inferSelect;
export type InsertDeliveryRequest = z.infer<typeof insertDeliveryRequestSchema>;
export type DeliveryRequestItem = typeof deliveryRequestItems.$inferSelect;
export type InsertDeliveryRequestItem = z.infer<typeof insertDeliveryRequestItemSchema>;

// Extended types for UI
export type DeliveryRequestWithDetails = DeliveryRequest & {
  building?: Building;
  costCenter?: CostCenter;
  fulfilledByUser?: User;
  items: (DeliveryRequestItem & {
    part?: Part;
  })[];
};
