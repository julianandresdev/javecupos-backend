export const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 días
export const REFRESH_TOKEN_EXPIRY_DAYS = 7;


export const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: REFRESH_TOKEN_EXPIRY,
});
