import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';

const mockUpdateUser = vi.fn();
const mockEq = vi.fn(async () => ({ error: null }));
const mockUpdate = vi.fn(() => ({ eq: mockEq }));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { updateUser: mockUpdateUser },
    from: () => ({ update: mockUpdate }),
  }),
}));

describe('Auth Store - updateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'u1', email: 'asha@example.com', user_metadata: { first_name: 'Old' } } as any,
    });
  });

  it('saves all fields (incl. dob) to auth metadata and refreshes the stored user', async () => {
    const updatedUser = {
      id: 'u1',
      email: 'asha@example.com',
      user_metadata: { first_name: 'Asha', last_name: 'Rao', phone: '9876501234', dob: '1999-04-02' },
    };
    mockUpdateUser.mockResolvedValue({ data: { user: updatedUser }, error: null });

    await useAuthStore.getState().updateProfile({
      firstName: 'Asha', lastName: 'Rao', phone: '9876501234', dob: '1999-04-02',
    });

    expect(mockUpdateUser).toHaveBeenCalledWith({
      data: { first_name: 'Asha', last_name: 'Rao', phone: '9876501234', dob: '1999-04-02' },
    });
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Asha Rao', phone: '9876501234' }));
    expect(useAuthStore.getState().user).toEqual(updatedUser);
  });

  it('throws and keeps the old user when Supabase rejects the update', async () => {
    mockUpdateUser.mockResolvedValue({ data: { user: null }, error: new Error('denied') });

    await expect(
      useAuthStore.getState().updateProfile({ firstName: 'Asha', lastName: 'Rao' })
    ).rejects.toThrow('denied');
    expect(useAuthStore.getState().user?.user_metadata.first_name).toBe('Old');
  });
});
