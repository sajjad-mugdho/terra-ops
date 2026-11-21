import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requirePageRole } from "@/features/auth/guards";
import { ProductTable } from "@/features/settings/components/product-table";
import { listProductsForAdmiral } from "@/features/settings/service";

export const metadata: Metadata = { title: "Products" };

export default async function AdmiralProductsPage() {
  await requirePageRole("admiral");
  const products = await listProductsForAdmiral();

  return (
    <>
      <PageHeader
        title="Products"
        description="Price and making cost of the five products. A change applies to new orders only: orders already placed keep their amounts."
      />
      <ProductTable products={products} />
    </>
  );
}
