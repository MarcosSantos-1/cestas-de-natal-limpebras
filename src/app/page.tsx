import PublicFlow from "@/components/public-flow";
export default function Page() {
  return <PublicFlow label={process.env.CAMPAIGN_LABEL || "Natal 2026"} />;
}
