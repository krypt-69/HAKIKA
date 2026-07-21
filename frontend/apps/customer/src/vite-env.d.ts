/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_BASE?: string;
  readonly VITE_ROUTER_BASENAME?: string;
  readonly VITE_CUSTOMER_BASE?: string;
  readonly VITE_BUSINESS_BASE?: string;
  readonly VITE_RIDER_BASE?: string;
  readonly VITE_ADMIN_BASE?: string;
}
