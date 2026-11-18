import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-guards";
import { parseLeadFilters } from "@/features/leads/filters";
import { getLead, getLeadFacets, getLeads } from "@/features/leads/queries";
import { LeadFilters } from "@/features/leads/components/lead-filters";
import { LeadsTable } from "@/features/leads/components/leads-table";
import { QuickAddLeadSheet } from "@/features/leads/components/quick-add-lead-sheet";
import { LeadDetailView } from "@/features/leads/components/lead-detail-view";
import type { LeadStatusType } from "@/features/leads/schema";

const VIEW_CONFIG: Record<
  string,
  { title: string; subtitle: string; defaultStatuses: LeadStatusType[] }
> = {
  all: {
    title: "All Leads",
    subtitle: "Complete pipeline of photobooth inquiries.",
    defaultStatuses: [],
  },
  new: {
    title: "New Leads",
    subtitle: "Recently received inquiries awaiting first contact.",
    defaultStatuses: ["NEW"],
  },
  potential: {
    title: "Potential Leads",
    subtitle: "Active leads in contact, quoting, or follow-up stages.",
    defaultStatuses: ["CONTACTED", "QUOTED", "FOLLOW_UP"],
  },
  postponed: {
    title: "Postponed Leads",
    subtitle: "Inquiries delayed to later dates or seasons.",
    defaultStatuses: ["POSTPONED"],
  },
  lost: {
    title: "Lost Leads",
    subtitle: "Closed inquiries with logged reasons for loss.",
    defaultStatuses: ["LOST"],
  },
};

interface LeadViewPageProps {
  params: Promise<{ view: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LeadViewOrDetailPage({
  params,
  searchParams,
}: LeadViewPageProps) {
  const session = await requireRole(["PARTNER", "SALES"]);
  const { view } = await params;
  const viewKey = view.toLowerCase();

  // 1. If it's a known pipeline view (new, potential, postponed, lost, all)
  if (viewKey in VIEW_CONFIG) {
    const config = VIEW_CONFIG[viewKey];
    const rawParams = await searchParams;
    const filters = parseLeadFilters(rawParams);

    // Apply default starting statuses if not specified in query params
    if (!rawParams.status && config.defaultStatuses.length > 0) {
      filters.status = [...config.defaultStatuses];
    }

    const [data, facets] = await Promise.all([
      getLeads(filters, session.user),
      getLeadFacets(),
    ]);

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{config.title}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {config.subtitle}
            </p>
          </div>
          <QuickAddLeadSheet facets={facets} />
        </div>

        <LeadFilters facets={facets} totalCount={data.total} />

        <LeadsTable
          leads={data.leads}
          total={data.total}
          page={data.page}
          pageSize={data.pageSize}
          totalPages={data.totalPages}
          currentPath={`/leads/${viewKey}`}
          searchParams={rawParams}
        />
      </div>
    );
  }

  // 2. Otherwise treat as a Lead Code (e.g. ENQ-001)
  const lead = await getLead(view);
  if (!lead) {
    notFound();
  }

  const facets = await getLeadFacets();

  return <LeadDetailView lead={lead} users={facets.users} />;
}
