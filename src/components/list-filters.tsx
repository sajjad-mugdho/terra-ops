import Form from "next/form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SEARCH_MAX } from "@/lib/search";

type Select = {
  name: string;
  label: string;
  value: string;
  emptyLabel?: string;
  options: { value: string; label: string }[];
};

type Props = {
  path:
    | "/customer/orders"
    | "/manager/orders"
    | "/captain/trips"
    | "/admiral/orders"
    | "/admiral/trips"
    | "/admiral/history";
  search?: { label: string; placeholder: string; value: string };
  selects?: Select[];
};

// Filters are plain URL parameters: the form is a GET. It sends no page, so a new filter starts at page 1.
export function ListFilters({ path, search, selects = [] }: Props) {
  const active = !!search?.value || selects.some((select) => select.value !== "");

  return (
    <Form
      // Remounts when the URL filters change, so the fields follow "Clear" and the back button.
      key={[search?.value, ...selects.map((select) => select.value)].join("|")}
      action={path}
      role="search"
      className="mb-4 flex flex-wrap items-end gap-3"
    >
      {search && (
        <div className="flex w-full flex-col gap-1.5 sm:w-64">
          <Label htmlFor="q">{search.label}</Label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={search.value}
            placeholder={search.placeholder}
            maxLength={SEARCH_MAX}
            autoComplete="off"
          />
        </div>
      )}
      {selects.map((select) => (
        <div key={select.name} className="flex flex-col gap-1.5">
          <Label htmlFor={select.name}>{select.label}</Label>
          <NativeSelect id={select.name} name={select.name} defaultValue={select.value}>
            <NativeSelectOption value="">{select.emptyLabel ?? "All"}</NativeSelectOption>
            {select.options.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      ))}
      <Button type="submit">{search ? "Search" : "Filter"}</Button>
      {active && (
        <Button variant="ghost" nativeButton={false} render={<Link href={path} />}>
          Clear
        </Button>
      )}
    </Form>
  );
}
