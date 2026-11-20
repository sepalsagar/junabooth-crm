// src/features/ai-agent/tools.ts
// Groq tool definitions — what the AI can do in the CRM

export const CRM_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "create_lead",
      description:
        "Create a new enquiry/lead in the CRM when someone shows interest. Use when the user describes a new contact, potential client, enquiry, or lead.",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string", description: "Full name of the client/enquiry person" },
          phone: { type: "string", description: "Indian mobile number (10 digits)" },
          city: { type: "string", description: "City or location of the client" },
          source: {
            type: "string",
            enum: ["INSTAGRAM", "META_AD", "BNI", "PSC", "WEBSITE", "REFERRAL", "B2B_PARTNER", "PHONE", "TR_EVENT", "OTHER"],
            description: "Where did this lead come from",
          },
          notes: { type: "string", description: "Any additional details, event type, budget, or requirements mentioned" },
          targetDate: { type: "string", description: "Target event date if mentioned (ISO 8601 format YYYY-MM-DD)" },
        },
        required: ["clientName", "phone"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_booking",
      description:
        "Create a confirmed booking/event when a lead has been converted or a booking is directly described. Use when event date, pricing, and client details are all mentioned.",
      parameters: {
        type: "object",
        properties: {
          clientName: { type: "string", description: "Full name of the client" },
          phone: { type: "string", description: "Indian mobile number (10 digits)" },
          city: { type: "string", description: "City where the event will happen" },
          venue: { type: "string", description: "Venue name or address or Google Maps link" },
          eventDate: { type: "string", description: "Event date in ISO format YYYY-MM-DD" },
          startTime: { type: "string", description: "Event start time in HH:MM format" },
          endTime: { type: "string", description: "Event end time in HH:MM format" },
          basePrice: { type: "number", description: "Package or booking fee in rupees (integer)" },
          advance: { type: "number", description: "Advance amount received in rupees (integer)" },
          notes: { type: "string", description: "Any notes, special requirements, or additional info" },
        },
        required: ["clientName", "phone", "eventDate", "basePrice"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_expense",
      description:
        "Record a business expense. Use when the user mentions spending, costs, payments made, or any expenditure.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["OPERATOR_FEE", "TRANSPORT", "FOOD", "VENUE_CUT", "CONSUMABLES", "EQUIPMENT", "SOFTWARE", "CARPENTRY", "EMI", "MARKETING", "ADMIN", "OTHER"],
            description: "Category of the expense",
          },
          amount: { type: "number", description: "Expense amount in rupees (integer)" },
          spentOn: { type: "string", description: "Date the expense was incurred (ISO format YYYY-MM-DD, default to today)" },
          paidBy: { type: "string", description: "Who paid for this expense (partner name)" },
          note: { type: "string", description: "Description or notes about the expense" },
        },
        required: ["category", "amount", "spentOn"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "query_summary",
      description:
        "Query the CRM for information and get a quick summary. Use when the user asks questions about data, stats, or wants to know something.",
      parameters: {
        type: "object",
        properties: {
          queryType: {
            type: "string",
            enum: ["today_leads", "upcoming_events", "overdue_collections", "recent_bookings", "total_stats"],
            description: "What data to fetch",
          },
        },
        required: ["queryType"],
      },
    },
  },
] as const;

export type ToolName = "create_lead" | "create_booking" | "add_expense" | "query_summary";
