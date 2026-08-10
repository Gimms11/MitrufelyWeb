import { create } from 'zustand'

interface MaintenanceState {
  isMaintenance: boolean
  setMaintenance: (val: boolean) => void
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  isMaintenance: false,
  setMaintenance: (val) => set({ isMaintenance: val }),
}))
