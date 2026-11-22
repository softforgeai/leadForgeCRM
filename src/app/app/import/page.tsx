import { Card, PageTitle } from "@/components/ui";
import { ImportForm } from "./ImportForm";

export const metadata = { title: "Import leads" };

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageTitle title="Import leads" description="Upload a CSV file exported from a spreadsheet or another CRM." />
      <Card className="p-5 sm:p-6">
        <ImportForm />
      </Card>
      <Card className="p-5 text-sm sm:p-6">
        <h2 className="font-semibold">File format</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
          <li>
            The first row must be column headers. A <strong className="text-fg">Name</strong> column is required.
          </li>
          <li>Optional columns: Company, Email, Phone, Source, Value, Tags, Notes.</li>
          <li>Source can be website, referral, linkedin, ads or other. Anything else becomes &quot;other&quot;.</li>
          <li>Imported leads go into your first pipeline stage and are assigned to you.</li>
          <li>Up to 2,000 rows and 1 MB per file. Rows with problems are skipped and listed.</li>
        </ul>
      </Card>
    </div>
  );
}
