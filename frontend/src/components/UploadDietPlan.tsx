import { type ChangeEvent } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { uploadDietPlan } from "../api/diet-plan";
import { activeDietPlanQueryOptions, dietPlanErrorMessage } from "../hooks/useActiveDietPlan";

import "./UploadDietPlan.css";

export default function UploadDietPlan() {
  const queryClient = useQueryClient();
  const upload = useMutation({
    mutationFn: async (file: File) => {
      await uploadDietPlan(file);
      return queryClient.fetchQuery(activeDietPlanQueryOptions());
    },
  });

  function onChooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.item(0) ?? null;
    event.currentTarget.value = "";
    if (file === null) {
      return;
    }
    upload.mutate(file);
  }

  return (
    <div className="upload-diet-plan">
      <label>
        Upload diet plan
        <input
          type="file"
          accept="application/pdf,.pdf"
          disabled={upload.isPending}
          onChange={onChooseFile}
        />
      </label>
      {upload.isError ? <p role="alert">{dietPlanErrorMessage(upload.error)}</p> : null}
    </div>
  );
}
