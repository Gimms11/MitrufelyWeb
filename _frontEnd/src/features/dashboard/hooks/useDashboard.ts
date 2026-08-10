import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api/dashboard.api'

export const DASHBOARD_QUERY_KEY = ['admin', 'dashboard'] as const

export function useDashboardQuery(dias: number = 30) {
  return useQuery({
    queryKey: ['admin', 'dashboard', dias],
    queryFn: () => dashboardApi.getMetrics(dias),
    staleTime: 60000,
  })
}
