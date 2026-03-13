import AdminResourcePage from "@/components/admin-resource-page";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function AdminCaptionExamplesPage({ searchParams }: PageProps) {
  return <AdminResourcePage searchParams={searchParams} slug="caption-examples" />;
}
