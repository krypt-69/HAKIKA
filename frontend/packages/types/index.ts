export interface User {
  id: string;
  email: string;
  role: 'owner' | 'rider' | 'admin';
}

export interface ApiError {
  success: false;
  error: { code: string; message: string };
}
