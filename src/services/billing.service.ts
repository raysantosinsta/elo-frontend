import { api } from "./api";

export type BillingPlan = {
  id: string;
  name: string;
  description?: string;
  price: string | number;
  period: "MONTHLY" | "YEARLY";
  trialDays: number;
  userLimit?: number;
  isActive: boolean;
};

export type BillingKpis = {
  accounts: {
    trialActive: number;
    trialExpired: number;
    active: number;
    overdue: number;
  };
  partners: {
    pendingApproval: number;
  };
  withdrawals: {
    pendingReview: number;
  };
  webhooks: {
    failed: number;
  };
  revenue: {
    received: string | number;
  };
};

export type Partner = {
  id: string;
  code: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "BLOCKED";
  commissionRate: string | number;
  company?: {
    id: string;
    name: string;
    email?: string;
  };
};

export const billingService = {
  getPlans: (includeInactive = false) =>
    api.get<BillingPlan[]>("/billing/plans", { params: { includeInactive } }),

  createPlan: (data: {
    name: string;
    description?: string;
    price: number;
    period: "MONTHLY" | "YEARLY";
    trialDays: number;
    userLimit?: number;
  }) => api.post<BillingPlan>("/billing/plans", data),

  updatePlan: (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      price: number;
      period: "MONTHLY" | "YEARLY";
      trialDays: number;
      userLimit: number;
      isActive: boolean;
    }>,
  ) => api.patch<BillingPlan>(`/billing/plans/${id}`, data),

  deletePlan: (id: string) => api.delete<BillingPlan>(`/billing/plans/${id}`),

  getMyBilling: () => api.get("/billing/me"),

  getAdminKpis: () => api.get<BillingKpis>("/billing/admin/kpis"),

  startTrial: (data: {
    companyId: string;
    trialDays?: number;
    partnerCode?: string;
  }) => api.post("/billing/trial/start", data),

  createSubscription: (data: {
    companyId: string;
    planId: string;
    nextDueDate?: string;
    billingType?: string;
  }) => api.post("/billing/subscriptions", data),

  createCheckout: (data: {
    companyId: string;
    planId: string;
    billingType?: string;
  }) =>
    api.post<{
      subscriptionId: string;
      paymentLinkId: string;
      checkoutUrl: string;
    }>("/billing/checkout", data),

  getPartners: () => api.get<Partner[]>("/billing/partners"),

  createPartner: (data: {
    companyId: string;
    userId?: string;
    commissionRate?: number;
  }) => api.post<Partner>("/billing/partners", data),

  reviewPartner: (
    id: string,
    data: { status: "APPROVED" | "REJECTED" | "BLOCKED"; rejectedReason?: string },
  ) => api.patch(`/billing/partners/${id}/review`, data),

  getCommissions: (params?: { partnerId?: string; status?: string }) =>
    api.get("/billing/commissions", { params }),

  releaseCommissions: () => api.post("/billing/commissions/release"),
};
