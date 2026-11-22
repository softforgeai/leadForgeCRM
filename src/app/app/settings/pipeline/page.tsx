import { requireWorkspace } from "@/lib/auth";
import { getStageCounts, getStages } from "@/lib/data";
import { FALLBACK_COLOR, stageColors } from "@/lib/stage-colors";
import { SettingsSection } from "../SettingsSection";
import { AddStageForm, StageList } from "../SettingsForms";

export const metadata = { title: "Pipeline settings" };

export default async function PipelineSettingsPage() {
  const ctx = await requireWorkspace();
  const [stages, counts] = await Promise.all([getStages(ctx.workspace.id), getStageCounts(ctx.workspace.id)]);
  const colors = stageColors(stages);
  const canEdit = ctx.isManager && !ctx.workspace.is_demo;
  const openCount = stages.filter((s) => s.kind === "open").length;

  return (
    <>
      <SettingsSection
        title="Pipeline stages"
        description={
          <>
            <p>Rename stages to match how your team sells. Open stages appear on the board in this order.</p>
            <p className="mt-2">
              Won and Lost close a deal and feed your win rate. A stage can only be removed once it has no deals.
            </p>
          </>
        }
        flush
        footer={
          <span className="mr-auto text-xs text-subtle">
            {openCount} open {openCount === 1 ? "stage" : "stages"} · {stages.length} total (max 12)
          </span>
        }
      >
        <StageList
          stages={stages.map((s) => ({
            id: s.id,
            name: s.name,
            kind: s.kind,
            count: counts.get(s.id) ?? 0,
            dot: (colors.get(s.id) ?? FALLBACK_COLOR).dot,
          }))}
          disabled={!canEdit}
        />
      </SettingsSection>

      {canEdit && (
        <SettingsSection title="Add a stage" description="New stages are added after your last open stage, before Won and Lost.">
          <AddStageForm />
        </SettingsSection>
      )}
    </>
  );
}
