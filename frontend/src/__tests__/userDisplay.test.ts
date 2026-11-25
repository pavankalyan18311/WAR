import { describe, expect, it } from 'vitest';
import { getUserDisplayInfo } from '@/lib/userDisplay';

describe('getUserDisplayInfo', () => {
  it('reads name, phone and dob from Supabase user_metadata', () => {
    const user = {
      email: 'asha@example.com',
      user_metadata: { first_name: 'Asha', last_name: 'Rao', phone: '9876501234', dob: '1999-04-02' },
    };

    expect(getUserDisplayInfo(user as any)).toEqual({
      name: 'Asha Rao',
      initial: 'A',
      email: 'asha@example.com',
      phone: '9876501234',
      dob: '1999-04-02',
    });
  });

  it('falls back to the email prefix when no name was saved, never a fake name', () => {
    const user = { email: 'kiran@example.com', user_metadata: {} };

    const info = getUserDisplayInfo(user as any);

    expect(info.name).toBe('kiran');
    expect(info.initial).toBe('K');
    expect(info.phone).toBeNull();
    expect(info.dob).toBeNull();
  });
});
