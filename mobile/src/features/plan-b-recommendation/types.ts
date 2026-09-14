export type ScheduleProgress = 'PLANNED' | 'COMPLETED';

export type ScheduleItem = {
  schedule_id: string;
  place_name: string;
  time_label: string;
};

export type RecommendationType = 'PLACE' | 'COURSE';

export type PlanItem = {
  time_label: string;
  title: string;
  status_label: string;
};

export type RecommendationOption = {
  option_id: string;
  recommendation_type: RecommendationType;
  title: string;
  summary: string;
  items: PlanItem[];
  evidence_labels: string[];
  caution_label: string | null;
  budget_label: string | null;
};
