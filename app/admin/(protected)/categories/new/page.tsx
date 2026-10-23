import { CategoryForm } from "@/components/admin/forms/CategoryForm";

export default function NewCategoryPage() {
  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">Taxonomy</p>
          <h1>New category</h1>
        </div>
      </header>
      <CategoryForm />
    </>
  );
}
