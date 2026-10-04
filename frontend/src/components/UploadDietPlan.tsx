import { type ChangeEvent, useRef } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { uploadDietPlan } from "../api/diet-plan";
import { activeDietPlanQueryOptions, dietPlanErrorMessage } from "../hooks/useActiveDietPlan";

import "./UploadDietPlan.css";

export default function UploadDietPlan() {
  const input = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const upload = useMutation({
    mutationFn: async (file: File) => {
      await uploadDietPlan(file);
      return queryClient.fetchQuery(activeDietPlanQueryOptions());
    },
  });

  function onChooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files;
    event.currentTarget.value = "";
    if (selected === null || selected.length === 0) {
      return;
    }
    upload.mutate(selected[0]);
  }

  return (
    <div className="upload-diet-plan">
      <input
        ref={input}
        className="upload-diet-plan-input"
        type="file"
        accept="application/pdf,.pdf"
        aria-hidden="true"
        tabIndex={-1}
        onChange={onChooseFile}
      />
      <button type="button" disabled={upload.isPending} onClick={() => input.current!.click()}>
        Upload diet plan
      </button>
      {upload.isError ? <p role="alert">{dietPlanErrorMessage(upload.error)}</p> : null}
    </div>
  );
}
