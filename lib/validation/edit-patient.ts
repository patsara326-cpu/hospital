import {
  newPatientDefaultValues,
  newPatientSchema,
  type NewPatientFormValues,
} from "./new-patient.ts";

// Editing an admission must obey the same domain choices and conditional rules
// as registering it. Keeping one schema prevents the two forms from drifting.
export const editPatientSchema = newPatientSchema;
export type EditPatientFormValues = NewPatientFormValues;

export const editPatientDefaultValues: EditPatientFormValues = {
  ...newPatientDefaultValues,
};
