import AdminApp from "@/components/admin-app";
export default function AdminPage() {
  return (
    <AdminApp campaignLabel={process.env.CAMPAIGN_LABEL || "Natal 2026"} />
  );
}
