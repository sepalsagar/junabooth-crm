import { requireRole } from "@/lib/auth-guards";
import { parseLeadFilters } from "@/features/leads/filters";
import { getLeadFacets, getLeads } from "@/features/leads/queries";
import { LeadFilters } from "@/features/leads/components/lead-filters";
import { LeadsTable } from "@/features/leads/components/leads-table";
import { QuickAddLeadSheet } from "@/features/leads/components/quick-add-lead-sheet";
import { StatusTabBar } from "@/components/ui/status-tab-bar";

interface LeadsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const session = await requireRole(["PARTNER", "SALES"]);
  const rawParams = await searchParams;
  const filters = parseLeadFilters(rawParams);

  const [data, facets] = await Promise.all([
    getLeads(filters, session.user),
    getLeadFacets(),
  ]);

  const statusTabs = [
    { value: "WON", label: "Won / Converted", count: facets.statusCounts["WON"] ?? 0 },
    { value: "NEW", label: "New Inquiries", count: facets.statusCounts["NEW"] ?? 0 },
    { value: "FOLLOW_UP", label: "Follow-Up", count: facets.statusCounts["FOLLOW_UP"] ?? 0 },
    { value: "LOST", label: "Lost / Cancelled", count: facets.statusCounts["LOST"] ?? 0 },
    { value: "POSTPONED", label: "Postponed", count: facets.statusCounts["POSTPONED"] ?? 0 },
    { value: "QUOTED", label: "Quoted", count: facets.statusCounts["QUOTED"] ?? 0 },
    { value: "CONTACTED", label: "Contacted", count: facets.statusCounts["CONTACTED"] ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads &amp; CRM</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Capture, track, and convert client inquiries with direct master booking linking.
          </p>
        </div>
        <QuickAddLeadSheet facets={facets} />
      </div>

      {/* Subparts Filter Tabs — Won, New, Lost, etc. */}
      <div className="space-y-3">
        <StatusTabBar tabs={statusTabs} />
        <LeadFilters facets={facets} totalCount={data.total} />
      </div>

      <LeadsTable
        leads={data.leads as any}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        totalPages={data.totalPages}
        currentPath="/leads"
        searchParams={rawParams}
      />
    </div>
  );
}
