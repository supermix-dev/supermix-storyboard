'use server';
import { resend } from '@/lib/resend';
import { CreateContactResponseSuccess } from 'resend';

export const subscribe = async (
  email: string
): Promise<{
  data: CreateContactResponseSuccess | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await resend.contacts.create({
      email,
      unsubscribed: false,
      audienceId: '311a8601-ffd5-4ef2-a6d5-814123c901d6',
    });
    return { data, error };
  } catch (error) {
    return { data: null, error: error as Error };
  }
};
