import AdminResourcePage from "@/components/admin-resource-page";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function AdminLlmModelsPage({ searchParams }: PageProps) {
  return <AdminResourcePage searchParams={searchParams} slug="llm-models" />;
}
