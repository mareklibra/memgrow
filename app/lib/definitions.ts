export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
};

export type TeachingForm = "show" | "write" | "choose_4" | "choose_8";
export const TeachingFormCount = 4;

export type Word = {
  id: string;
  word: string;
  definition: string;

  memLevel: number;
  form: TeachingForm;

  similarWords?: Word[];
};

export type WordWithMeta = Word & {
  repeated: number;
};
