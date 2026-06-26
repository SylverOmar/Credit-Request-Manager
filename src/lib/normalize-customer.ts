import type { CustomerInput } from "@/lib/customer-schema";

function normalizeFirstName(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function normalizeCustomerInput(customer: CustomerInput): CustomerInput {
  return {
    ...customer,
    national_id: customer.national_id.trim().toUpperCase(),
    first_name: normalizeFirstName(customer.first_name),
    last_name: customer.last_name.trim().toUpperCase(),
  };
}
