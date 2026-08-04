import { TourForm } from "@/components/admin/forms/TourForm";

export default function NewTourPage() {
  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">Tour management</p>
          <h1>New tour</h1>
        </div>
      </header>
      <TourForm />
    </>
  );
}
