declare namespace google {
  namespace accounts {
    namespace id {
      interface InitializeConfig {
        client_id: string
        callback?: (response: CredentialResponse) => void
        login_uri?: string
        ux_mode?: 'popup' | 'redirect'
        auto_select?: boolean
        cancel_on_tap_outside?: boolean
        prompt_parent_id?: string
        nonce?: string
        context?: string
        state_cookie_domain?: string
        itp_support?: boolean
      }

      interface CredentialResponse {
        credential: string
        select_by?: string
      }

      interface RenderButtonConfig {
        type?: 'standard' | 'icon'
        theme?: 'outline' | 'filled_blue' | 'filled_black'
        size?: 'large' | 'medium' | 'small'
        text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
        shape?: 'rectangular' | 'pill' | 'circle' | 'square'
        logo_alignment?: 'left' | 'center'
        width?: string
        locale?: string
      }

      function initialize(config: InitializeConfig): void
      function renderButton(parent: HTMLElement, config: RenderButtonConfig): void
      function prompt(callback?: (notification: unknown) => void): void
      function revoke(email: string, callback: (done: unknown) => void): void
      function disableAutoSelect(): void
    }
  }
}
