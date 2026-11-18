import { requireRole } from "@/lib/auth-guards";
import { parseLeadFilters } from "@/features/leads/filters";
import { getLeadFacets, getLeads } from "@/features/leads/queries";
import { LeadFilters } from "@/features/leads/components/lead-filters";
import { LeadsTable } from "@/features/leads/components/leads-table";
import { QuickAddLeadSheet } from "@/features/leads/components/quick-add-lead-sheet";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Capture, track, and convert client inquiries for photobooths.
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
        currentPath="/leads"
        searchParams={rawParams}
      />
    </div>
  );
}
