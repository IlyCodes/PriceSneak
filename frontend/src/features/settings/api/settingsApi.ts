import { apiFetch } from '../../../api/apiClient';

export interface UserUpdateData {
  name?: string;
  email?: string;
}

export interface PasswordUpdateData {
  current_password: string;
  new_password: string;
}

export interface UserSettings {
  currency: string;
  dashboard_notification: boolean;
  email_notification: boolean;
  language: string;
}

export const updateProfileInfo = async (data: UserUpdateData) => {
  return apiFetch('/api/auth/me', {
    method: 'PUT',
    data,
  });
};

export const updatePassword = async (data: any) => {
  return apiFetch('/api/auth/me/password', {
    method: 'PUT',
    data,
  });
};

export const getSettings = async (): Promise<UserSettings> => {
  return apiFetch<UserSettings>('/api/auth/me/settings');
};

export const updateSettings = async (data: Partial<UserSettings>) => {
  return apiFetch<UserSettings>('/api/auth/me/settings', {
    method: 'PUT',
    data,
  });
};
