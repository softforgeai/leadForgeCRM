import { ExternalLink } from "lucide-react";
import { requireWorkspace } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { SettingsSection } from "../SettingsSection";
import { CopyField, RegenerateFormLink } from "../SettingsForms";

export const metadata = { title: "Lead capture settings" };

export default async function LeadCaptureSettingsPage() {
  const ctx = await requireWorkspace();
  if (!ctx.isManager) {
    return (
      <SettingsSection title="Lead capture form" description="Only owners and admins can view and share the form link.">
        <p className="text-sm text-muted">Ask an owner or admin for your workspace&apos;s form link.</p>
      </SettingsSection>
    );
  }

  const formUrl = `${publicEnv.NEXT_PUBLIC_SITE_URL}/f/${ctx.workspace.form_token}`;
  const embed = `<iframe src="${formUrl}?embed=1" title="Contact form" width="100%" height="560" style="border:0"></iframe>`;
  const canEdit = !ctx.workspace.is_demo;

  return (
    <>
      <SettingsSection
        title="Share your form"
        description="Send this link to prospects or add it to your email signature. Every submission becomes a new deal in your first stage."
      >
        <div className="space-y-4">
          <CopyField label="Form link" value={formUrl} />
          <a
            href={formUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-text hover:underline"
          >
            Open the form in a new tab <ExternalLink aria-hidden className="size-3.5" />
          </a>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Embed on your website"
        description="Paste this code into any page on your website. The form adapts to the width of its container."
      >
        <CopyField label="Embed code" value={embed} multiline />
      </SettingsSection>

      <SettingsSection title="Preview" description="This is what visitors see when the form is embedded." flush>
        <div className="bg-surface-2/60 p-4">
          <iframe
            src={`${formUrl}?embed=1`}
            title="Lead form preview"
            className="h-[34rem] w-full rounded-lg border border-line bg-surface"
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Spam protection"
        description="Built in and always on. No setup needed."
      >
        <ul className="space-y-2 text-sm text-muted">
          <li>• Hidden spam trap that catches most bots</li>
          <li>• At most 5 submissions per visitor per hour, and 500 per day for the whole form</li>
          <li>• Every field is validated on the server before it&apos;s saved</li>
        </ul>
      </SettingsSection>

      <SettingsSection
        title="Reset the link"
        description="If your link is being abused, generate a new one. The old link and any embeds using it stop working immediately."
      >
        <RegenerateFormLink disabled={!canEdit} />
      </SettingsSection>
    </>
  );
}
