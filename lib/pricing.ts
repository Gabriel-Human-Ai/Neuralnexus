export const BILLING = { monthly: "monthly", yearly: "yearly" } as const;
export type BillingCycle = (typeof BILLING)[keyof typeof BILLING];

export const YEARLY_DISCOUNT = 0.2;

export const PLANS = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    tagline: "Start building your profile.",
    features: ["1 profile", "Bring your own API keys", "Core chat and learning", "Manual export"],
    cta: "Get started",
    highlighted: false,
    perSeat: false,
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 29,
    tagline: "Your profile, everywhere.",
    features: ["Everything in Free", "Managed AI credits included", "Unlimited profiles", "One-click export to any AI", "Deeper signal learning", "Priority support"],
    cta: "Start Pro",
    highlighted: true,
    perSeat: false,
  },
  {
    id: "studio",
    name: "Studio",
    monthly: 79,
    tagline: "For teams and agencies.",
    features: ["Everything in Pro", "Shared team profiles", "Client mode", "Profile licensing", "Admin controls"],
    cta: "Start Studio",
    highlighted: false,
    perSeat: true,
  },
] as const;

export function monthlyPrice(plan: (typeof PLANS)[number], billing: BillingCycle) {
  if (plan.monthly === 0) return 0;
  if (billing === "monthly") return plan.monthly;
  return Math.round(plan.monthly * (1 - YEARLY_DISCOUNT));
}
