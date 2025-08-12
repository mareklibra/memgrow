'use server';

import { sql } from '@vercel/postgres';
import bcrypt from 'bcrypt';
import { AuthError } from 'next-auth';

import { signIn } from '@/auth';

export async function authenticate(_: string | undefined, formData: FormData) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

export async function changeUserPassword(userId: string, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  try {
    await sql`
        UPDATE users
        SET password = ${hashedPassword}
        WHERE id = ${userId}
      `;
  } catch (e) {
    return {
      message: `Database Error: Failed to change user password. ${JSON.stringify(e)}`,
    };
  }
}

export async function addNewUser(user: {
  name: string;
  email: string;
  password: string;
}) {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  try {
    await sql`
        INSERT INTO users (name, email, password)
        VALUES (${user.name.trim()}, ${user.email.trim()}, ${hashedPassword})
      `;
  } catch (e) {
    return {
      message: `Database Error: Failed to add new user. ${JSON.stringify(e)}`,
    };
  }
}
