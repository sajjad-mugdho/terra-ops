import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { updateProductAction } from "../actions";
import type { ProductForAdmiral } from "../service";
import { EditMoneyDialog } from "./edit-money-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function ProductTable({ products }: { products: ProductForAdmiral[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Making cost</TableHead>
            <TableHead className="text-right">Margin per unit</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">
                <span className="flex flex-wrap items-center gap-2">
                  {product.name}
                  {product.sellsAtLoss && (
                    <StatusBadge label="This product sells at a loss" tone="danger" />
                  )}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Money cents={product.priceCents} />
              </TableCell>
              <TableCell className="text-right">
                <Money cents={product.makingCostCents} />
              </TableCell>
              <TableCell className="text-right">
                <Money cents={product.marginCents} />
              </TableCell>
              <TableCell>
                <EditMoneyDialog
                  id={product.id}
                  title={`Edit ${product.name}`}
                  action={updateProductAction}
                  fields={[
                    {
                      name: "price",
                      label: "Price",
                      cents: product.priceCents,
                      hint: "Applies to new orders only.",
                    },
                    {
                      name: "makingCost",
                      label: "Making cost",
                      cents: product.makingCostCents,
                      hint: "Applies to new orders only.",
                    },
                  ]}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
