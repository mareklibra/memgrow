export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  is_admin: boolean;
  can_change_shared_dicts?: boolean;
  locale: string | null;
};

export type UserListItem = {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  can_change_shared_dicts: boolean;
  created_at: Date | string;
  private_course_count: number;
};

export type AdminCourse = {
  id: string;
  name: string;
  knownLang: string;
  learningLang: string;
  courseCode: string;
  isPublic: boolean;
  ownerUserId: string | null;
  ownerName: string | null;
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
  progressUpdatedAt?: Date;
  isPriority: boolean;
  isSkipped: boolean;

  // calculated:
  similarWords?: Word[];
};

export type WordToAdd = Pick<Word, 'word' | 'definition' | 'courseId'> & {
  repeat?: number;
};

export type SessionProbe = {
  kind: 'recall_picture' | 'recall_previous';
  /** Set only for `recall_previous`. Always 1 until a later lag is built. */
  lag?: number;
  /** Learning-language headword snapshotted when the card is inserted. */
  answer: string;
  /** Oldest stored image. Picture probes only. */
  imageId?: string;
};

export type WordWithMeta = Word & {
  repeated: number;
  probe?: SessionProbe;
  /**
   * Probe-stacked memLevel kept for saving while a later copy of this word
   * is still unanswered. The later copy's own memLevel is what the user plays.
   */
  pendingProbeMemLevel?: number;
};

export type DbCourse = {
  id: string;
  name: string;
  known_lang: string;
  learning_lang: string;
  course_code: string;
  total: number;
  course_priority?: number;
  is_public?: boolean;
  owned_by_me?: boolean;
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
  isPublic: boolean;
  ownedByMe: boolean;
  /** ISO time of the latest word in the next due-empty test batch. Set only when `toTest` is 0. */
  advancedBatchUntil?: string | null;
};

export type UserProgress = {
  userId: string;
  wordId: string;

  memLevel: number;
  form: TeachingForm;
};

export type WordImage = {
  id: string;
  wordId: string;
  content: Buffer;
  createdAt: Date;
};

export type ImageRequest = {
  wordId: string;
  createdAt: Date;
  inProgressSince: Date | null;
};
