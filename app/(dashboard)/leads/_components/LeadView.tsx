"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAccessToken } from "@/lib/tokens";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

interface LeadDetail {
  id: number;
  full_name?: string;
  name?: string;
  email?: string;
  mobile_number?: string;
  phone?: string;
  status?: string;
  amount_required?: number;
  loan_amount?: number;
  loan_type?: string;
  product_name?: string;
  lender_name?: string;
  category_name?: string;
  employment_type?: string;
  annual_income?: number;
  date_of_birth?: string;
  gender?: string;
  pan_number?: string;
  aadhar_number?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

const STATUS_COLOR: Record<string, string> = {
  new:       "bg-blue-100 text-blue-700",
  pending:   "bg-yellow-100 text-yellow-700",
  approved:  "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-700",
  in_review: "bg-purple-100 text-purple-700",
};

function fmt(val: unknown): string {
  if (val == null || val === "") return "—";
  return String(val);
}

function fmtDate(val: unknown): string {
  if (!val) return "—";
  try {
    return new Date(String(val)).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return String(val);
  }
}

function fmtCurrency(val: unknown): string {
  const n = Number(val);
  if (val == null || val === "" || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n);
}

interface RowProps {
  label: string;
  value: string;
}

function Row({ label, value }: RowProps) {
  return (
    <div className="py-3 grid grid-cols-2 gap-4 border-b last:border-0">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground break-words">{value}</dd>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b px-6 py-4">
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <dl className="px-6 divide-y">
        {children}
      </dl>
    </div>
  );
}

export function LeadView({ leadId }: { leadId: number }) {
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const token = getAccessToken();
    fetch(`${API}/v1/admin/leads/${leadId}`, {
      headers: { accept: "application/json", Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => setLead((json.data ?? json) as LeadDetail))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load lead"))
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/leads")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error ?? "Lead not found."}
        </div>
      </div>
    );
  }

  const name = fmt(lead.full_name ?? lead.name);
  const status = (lead.status ?? "").toLowerCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/leads")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">Lead Details</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Viewing details for lead #{lead.id}
          </p>
        </div>
        {lead.status && (
          <span
            className={[
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize",
              STATUS_COLOR[status] ?? "bg-gray-100 text-gray-600",
            ].join(" ")}
          >
            {lead.status.replace(/_/g, " ")}
          </span>
        )}
      </div>

      {/* Personal Info */}
      <Section title="Personal Information">
        <Row label="Full Name"    value={name} />
        <Row label="Email"        value={fmt(lead.email)} />
        <Row label="Mobile"       value={fmt(lead.mobile_number ?? lead.phone)} />
        {lead.date_of_birth  && <Row label="Date of Birth"    value={fmtDate(lead.date_of_birth)} />}
        {lead.gender         && <Row label="Gender"           value={fmt(lead.gender)} />}
        {lead.pan_number     && <Row label="PAN Number"       value={fmt(lead.pan_number)} />}
        {lead.aadhar_number  && <Row label="Aadhaar Number"   value={fmt(lead.aadhar_number)} />}
        {lead.employment_type && <Row label="Employment Type" value={fmt(lead.employment_type)} />}
        {lead.annual_income  && <Row label="Annual Income"    value={fmtCurrency(lead.annual_income)} />}
      </Section>

      {/* Loan Info */}
      <Section title="Loan / Enquiry Information">
        <Row label="Amount Required" value={fmtCurrency(lead.amount_required ?? lead.loan_amount)} />
        {lead.loan_type      && <Row label="Loan Type"     value={fmt(lead.loan_type)} />}
        {lead.product_name   && <Row label="Product"       value={fmt(lead.product_name)} />}
        {lead.lender_name    && <Row label="Lender"        value={fmt(lead.lender_name)} />}
        {lead.category_name  && <Row label="Category"      value={fmt(lead.category_name)} />}
        <Row label="Status"        value={lead.status ? lead.status.replace(/_/g, " ") : "—"} />
        {lead.remarks        && <Row label="Remarks"       value={fmt(lead.remarks)} />}
      </Section>

      {/* Address */}
      {(lead.address || lead.city || lead.state || lead.pincode) && (
        <Section title="Address">
          {lead.address  && <Row label="Address" value={fmt(lead.address)} />}
          {lead.city     && <Row label="City"    value={fmt(lead.city)} />}
          {lead.state    && <Row label="State"   value={fmt(lead.state)} />}
          {lead.pincode  && <Row label="Pincode" value={fmt(lead.pincode)} />}
        </Section>
      )}

      {/* Timestamps */}
      <Section title="Timeline">
        <Row label="Created At" value={fmtDate(lead.created_at)} />
        {lead.updated_at && <Row label="Updated At" value={fmtDate(lead.updated_at)} />}
      </Section>

      {/* Footer actions */}
      <div className="flex justify-end pb-8">
        <Button variant="outline" onClick={() => router.push("/leads")}>
          Back to Leads
        </Button>
      </div>
    </div>
  );
}
