import AdminResourcePage from "@/components/admin-resource-page";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default function AdminHumorMixPage({ searchParams }: PageProps) {
  return <AdminResourcePage searchParams={searchParams} slug="humor-mix" />;
}
