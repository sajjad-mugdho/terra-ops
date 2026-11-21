import Form from "next/form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Select = {
  name: string;
  label: string;
  value: string;
  emptyLabel?: string;
  options: { value: string; label: string }[];
};

type Props = { path: "/admiral/orders" | "/admiral/trips"; selects: Select[] };

// Filters are plain URL parameters: the form is a GET.
export function SelectFilters({ path, selects }: Props) {
  return (
    <Form action={path} className="mb-4 flex flex-wrap items-end gap-3">
      {selects.map((select) => (
        <div key={select.name} className="flex flex-col gap-1.5">
          <Label htmlFor={select.name}>{select.label}</Label>
          <select
            id={select.name}
            name={select.name}
            defaultValue={select.value}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">{select.emptyLabel ?? "All"}</option>
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      <Button type="submit">Filter</Button>
      <Button variant="ghost" nativeButton={false} render={<Link href={path} />}>
        Clear
      </Button>
    </Form>
  );
}
