import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { updateProductAction } from "../actions";
import type { ProductForAdmiral } from "../service";
import { EditMoneyDialog } from "./edit-money-dialog";

export function ProductTable({ products }: { products: ProductForAdmiral[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-normal">Product</th>
            <th className="px-3 py-2 text-right font-normal">Price</th>
            <th className="px-3 py-2 text-right font-normal">Making cost</th>
            <th className="px-3 py-2 text-right font-normal">Margin per unit</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-t">
              <td className="px-3 py-2 font-medium">
                <span className="flex flex-wrap items-center gap-2">
                  {product.name}
                  {product.sellsAtLoss && (
                    <StatusBadge label="This product sells at a loss" tone="danger" />
                  )}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                <Money cents={product.priceCents} />
              </td>
              <td className="px-3 py-2 text-right">
                <Money cents={product.makingCostCents} />
              </td>
              <td className="px-3 py-2 text-right">
                <Money cents={product.marginCents} />
              </td>
              <td className="px-3 py-2">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
