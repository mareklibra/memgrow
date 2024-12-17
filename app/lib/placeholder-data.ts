import { Course, UserProgress, DbWord } from "./definitions";

const users = [
  {
    id: "410544b2-4001-4271-9855-fec4b6a6442a",
    name: "Marek",
    email: "marek.libra@gmail.com",
    password: "foobar",
  },
];

const courses: Course[] = [
  {
    id: '3958dc9e-712f-4377-85e9-fec4b6a6442a',
    name: 'My Spanish',
    knownLang: 'Czech',
    learningLang: 'Spanish'
  }
];

const words: DbWord[] = [
  {
    id: 'd0e15727-9fe1-4961-8c5b-ea44a9bd81aa',
    word: "el sol",
    definition: "slunce",
    courseId: '3958dc9e-712f-4377-85e9-fec4b6a6442a',
  },
  {
    id: 'd1e15727-9fe1-4961-8c5b-ea44a9bd81aa',
    word: "el perro",
    definition: "pes",
    courseId: '3958dc9e-712f-4377-85e9-fec4b6a6442a',
  },
  {
    id: 'd2e15727-9fe1-4961-8c5b-ea44a9bd81aa',
    word: "el gato",
    definition: "kočka",
    courseId: '3958dc9e-712f-4377-85e9-fec4b6a6442a',
  },
  {
    id: 'd3e15727-9fe1-4961-8c5b-ea44a9bd81aa',
    word: "mañana",
    courseId: '3958dc9e-712f-4377-85e9-fec4b6a6442a',
    definition: "zítra",
  },
  {
    id: 'd4e15727-9fe1-4961-8c5b-ea44a9bd81aa',
    word: "la casa",
    courseId: '3958dc9e-712f-4377-85e9-fec4b6a6442a',
    definition: "dům",
  },
  {
    id: 'd5e15727-9fe1-4961-8c5b-ea44a9bd81aa',
    word: "el coche",
    courseId: '3958dc9e-712f-4377-85e9-fec4b6a6442a',
    definition: "auto",
  },
  {
    id: 'd6e15727-9fe1-4961-8c5b-ea44a9bd81aa',
    word: "bailar",
    courseId: '3958dc9e-712f-4377-85e9-fec4b6a6442a',
    definition: "tančit",
  },
  {
    id: 'd7e15727-9fe1-4961-8c5b-ea44a9bd81aa',
    word: "uno",
    courseId: '3958dc9e-712f-4377-85e9-fec4b6a6442a',
    definition: "jedna",
  },
];

const userProgresses: UserProgress[] = [
  {
    userId: users[0].id,
    wordId: words[0].id,
    form: "show",
    memLevel: 0,
  },
  {
    userId: users[0].id,
    wordId: words[1].id,
    form: "show",
    memLevel: 0,
  }
];

export { users, words, courses, userProgresses };
