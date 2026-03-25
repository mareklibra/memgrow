export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  is_admin: boolean;
};

export const TEACHING_FORMS = [
  'show',
  'choose_4_word',
  'choose_4_def',
  'write_mid',
  'choose_8_def',
  'write',
  'write_last',
] as const;
export type TeachingForm = (typeof TEACHING_FORMS)[number];
export const TeachingFormCount = TEACHING_FORMS.length;

export type DbWord = {
  id: string;
  course_id: string;
  word: string;
  definition: string;
};

export type Word = Omit<DbWord, 'course_id'> & {
  courseId: string;

  memLevel: number;
  form: TeachingForm;
  repeatAgain: Date;
  isPriority: boolean;
  isSkipped: boolean;

  // calculated:
  similarWords?: Word[];
};

export type WordToAdd = Pick<Word, 'word' | 'definition' | 'courseId'> & {
  repeat?: number;
};

export type WordWithMeta = Word & {
  repeated: number;
};

export type DbCourse = {
  id: string;
  name: string;
  known_lang: string;
  learning_lang: string;
  course_code: string;
  total: number;
  course_priority?: number;
};

export type Course = {
  id: string;
  name: string;
  knownLang: string;
  learningLang: string;
  courseCode: string;
  total: number;
  toLearn: number;
  toTest: number;
  withPriority: number;
  coursePriority?: number;
};

export type UserProgress = {
  userId: string;
  wordId: string;

  memLevel: number;
  form: TeachingForm;
};
