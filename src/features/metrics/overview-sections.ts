import type { Role } from "@/lib/permissions";

export interface OverviewSections {
  showCash: boolean;
  showProfit: boolean;
  showExpenses: boolean;
  showCapital: boolean;
  showRevenueChart: boolean;
  showLeadsChart: boolean;
  showCityChart: boolean;
  showUpcomingEvents: boolean;
  showFollowUpToday: boolean;
  showCollectThisWeek: boolean;
}

export function overviewSections(role: Role): OverviewSections {
  if (role === "PARTNER") {
    return {
      showCash: true,
      showProfit: true,
      showExpenses: true,
      showCapital: true,
      showRevenueChart: true,
      showLeadsChart: true,
      showCityChart: true,
      showUpcomingEvents: true,
      showFollowUpToday: true,
      showCollectThisWeek: true,
    };
  }

  if (role === "SALES") {
    return {
      showCash: false,
      showProfit: false,
      showExpenses: false,
      showCapital: false,
      showRevenueChart: false,
      showLeadsChart: true,
      showCityChart: true,
      showUpcomingEvents: true,
      showFollowUpToday: true,
      showCollectThisWeek: true,
    };
  }

  return {
    showCash: false,
    showProfit: false,
    showExpenses: false,
    showCapital: false,
    showRevenueChart: false,
    showLeadsChart: false,
    showCityChart: true,
    showUpcomingEvents: true,
    showFollowUpToday: false,
    showCollectThisWeek: false,
  };
}
