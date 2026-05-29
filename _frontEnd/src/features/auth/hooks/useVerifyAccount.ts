import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth.api'

export function useVerifyAccount() {
  return useMutation({
    mutationFn: (token: string) => authApi.verify(token),
  })
}
