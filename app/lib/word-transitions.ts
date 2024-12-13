import { TeachingForm } from "./definitions";

// TODO: introduce "write_reverse"
export function getNextForm(form: TeachingForm): TeachingForm {
  let newForm: TeachingForm = "show";
  if (form === "show") newForm = "choose_4_def";
  if (form === "choose_4_def") newForm = "choose_4_word";
  if (form === "choose_4_word") newForm = "choose_8_def";
  if (form === "choose_8_def") newForm = "write";

  // Following is not used during learning
  if (form === "write") newForm = "choose_4_def";

  return newForm;
}

export function getNumericForm(form: TeachingForm): number {
  let value = 0;
  if (form === "show") value = 0.1;
  if (form === "choose_4_def") value = 1;
  if (form === "choose_4_word") value = 2;
  if (form === "choose_8_def") value = 3;
  if (form === "write") value = 4;
  return value;
}

// TODO: tune following
// TODO: mind using days instead of a level
export function increaseMemLevel(level: number): number {
  return level + 10;
}

export function decreaseMemLevel(level: number): number {
  return Math.round(level / 2);
}
