import { TeachingForm } from "./definitions";

export function getNextForm(form: TeachingForm): TeachingForm {
  let newForm: TeachingForm = "show";
  if (form === "show") newForm = "choose_4";
  if (form === "choose_4") newForm = "choose_8";
  if (form === "choose_8") newForm = "write";
  return newForm;
}

export function getNumericForm(form: TeachingForm): number {
  let value = 0;
  if (form === "show") value = 0.1;
  if (form === "choose_4") value = 1;
  if (form === "choose_8") value = 2;
  if (form === "write") value = 3;
  return value;
}
