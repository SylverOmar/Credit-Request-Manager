import { z } from "zod";

const requiredNumber = (message: string, schema: z.ZodNumber) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number({ error: message }).pipe(schema),
  );

export const maritalStatusOptions = [
  { value: "single", label: "Celibataire" },
  { value: "married", label: "Marie(e)" },
  { value: "divorced", label: "Divorce(e)" },
  { value: "widowed", label: "Veuf / Veuve" },
] as const;

export const durationUnitOptions = [
  { value: "months", label: "Mois" },
  { value: "years", label: "Annees" },
] as const;

const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,80}$/;

export const moroccanIdPattern = /^[A-Z]{1,3}[0-9]{6,8}$/;
export const moroccanIdHelp =
  "CIN/CNIE invalide. Format attendu: 1 a 3 lettres suivies de 6 a 8 chiffres, ex: A1234567.";

export const customerSchema = z.object({
  bank_customer_id: z.string().uuid().optional(),
  national_id: z.string().trim().toUpperCase().regex(moroccanIdPattern, moroccanIdHelp),
  last_name: z
    .string()
    .trim()
    .regex(nameRegex, "Le nom doit contenir uniquement des lettres, espaces, apostrophes ou tirets."),
  first_name: z
    .string()
    .trim()
    .regex(nameRegex, "Le prenom doit contenir uniquement des lettres, espaces, apostrophes ou tirets."),
  age: requiredNumber(
    "L'age est obligatoire.",
    z
    .number()
    .int("L'age doit etre un nombre entier.")
    .min(18, "Le client doit avoir au moins 18 ans.")
    .max(100, "L'age doit etre realiste."),
  ),
  marital_status: z.enum(["single", "married", "divorced", "widowed"], {
    error: "Selectionnez une situation maritale valide.",
  }),
  children_count: requiredNumber(
    "Le nombre d'enfants est obligatoire.",
    z
    .number()
    .int("Le nombre d'enfants doit etre un entier.")
    .min(0, "Le nombre d'enfants ne peut pas etre negatif.")
    .max(20, "Le nombre d'enfants doit rester realiste."),
  ),
  annual_income: requiredNumber(
    "Le revenu annuel est obligatoire.",
    z
    .number()
    .min(0, "Le revenu annuel ne peut pas etre negatif.")
    .max(100000000, "Le revenu annuel doit rester realiste."),
  ),
});

export const creditRequestSchema = z.object({
  requested_amount: requiredNumber(
    "Le montant demande est obligatoire.",
    z
    .number()
    .min(1000, "Le montant demande doit etre au moins 1 000 MAD.")
    .max(100000000, "Le montant demande doit rester realiste."),
  ),
  duration_value: requiredNumber(
    "La duree est obligatoire.",
    z
    .number()
    .int("La duree doit etre un nombre entier.")
    .min(1, "La duree doit etre positive.")
    .max(600, "La duree doit rester realiste."),
  ),
  duration_unit: z.enum(["months", "years"], {
    error: "Selectionnez mois ou annees.",
  }),
  monthly_charges: requiredNumber(
    "Les charges mensuelles sont obligatoires.",
    z
    .number()
    .min(0, "Les charges mensuelles ne peuvent pas etre negatives.")
    .max(10000000, "Les charges mensuelles doivent rester realistes."),
  ),
});

export const creditApplicationSchema = z.object({
  customer: customerSchema,
  credit_request: creditRequestSchema,
});

export type CustomerInput = {
  bank_customer_id?: string;
  national_id: string;
  last_name: string;
  first_name: string;
  age: number;
  marital_status: "single" | "married" | "divorced" | "widowed";
  children_count: number;
  annual_income: number;
};

export type CreditRequestInput = {
  requested_amount: number;
  duration_value: number;
  duration_unit: "months" | "years";
  monthly_charges: number;
};

export type CreditApplicationInput = {
  customer: CustomerInput;
  credit_request: CreditRequestInput;
};

export type Customer = CustomerInput & {
  bank_customer_id: string;
  created_at?: string;
  updated_at?: string;
};

export type CreditApplication = CreditRequestInput & {
  application_id: string;
  bank_customer_id: string;
  status: "draft" | "submitted" | "reviewed" | "approved" | "rejected";
  created_at?: string;
  updated_at?: string;
};
