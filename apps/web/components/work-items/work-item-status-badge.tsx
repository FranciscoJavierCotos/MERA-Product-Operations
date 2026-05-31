import { Badge } from "@/components/ui/badge";
import type { WorkItemStatus } from "@/types/work-item.types";
import { WORK_ITEM_STATUS_LABELS } from "@/types/work-item.types";

const STYLE: Record<WorkItemStatus, string> = {
  todo:        "bg-gray-100 text-gray-800 hover:bg-gray-100",
  in_progress: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  in_review:   "bg-amber-100 text-amber-800 hover:bg-amber-100",
  done:        "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  rework:      "bg-orange-100 text-orange-800 hover:bg-orange-100",
};

export function WorkItemStatusBadge({ status }: { status: WorkItemStatus }) {
  return <Badge className={STYLE[status]}>{WORK_ITEM_STATUS_LABELS[status]}</Badge>;
}
