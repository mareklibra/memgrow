export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
};

export type TeachingForm = "show" | "write" | "choose_4_def" | "choose_4_word" | "choose_8_def";
export const TeachingFormCount = 4;

export type DbWord = {
  id: string;
  courseId: string;
  word: string;
  definition: string;
};

export type Word = DbWord & {
  memLevel: number;
  form: TeachingForm;

  // calculated:
  similarWords?: Word[];
};

export type WordWithMeta = Word & {
  repeated: number;
};

export type Course = {
  id: string;
  name: string;
  knownLang: string;
  learningLang: string;
}

export type UserProgress = {
  userId: string;
  wordId: string;

  memLevel: number;
  form: TeachingForm;
}