export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
};

export type TeachingForm =
  | 'show'
  | 'write'
  | 'write_last'
  | 'choose_4_def'
  | 'choose_4_word'
  | 'choose_8_def';
export const TeachingFormCount = 5;

export type DbWord = {
  id: string;
  course_id: string;
  word: string;
  definition: string;
};

export type WordToAdd = Pick<Word, 'word' | 'definition' | 'courseId'>;

export type Word = Omit<DbWord, 'course_id'> & {
  courseId: string;

  memLevel: number;
  form: TeachingForm;

  // calculated:
  similarWords?: Word[];
};

export type WordWithMeta = Word & {
  repeated: number;
};

export type DbCourse = {
  id: string;
  name: string;
  known_lang: string;
  learning_lang: string;
};

export type Course = {
  id: string;
  name: string;
  knownLang: string;
  learningLang: string;
};

export type UserProgress = {
  userId: string;
  wordId: string;

  memLevel: number;
  form: TeachingForm;
};
