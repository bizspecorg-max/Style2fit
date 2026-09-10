export const MIN_PASSWORD_LENGTH = 8;

/** 0 = too short … 4 = strong. */
export function passwordScore(password: string): number {
	if (password.length < MIN_PASSWORD_LENGTH) return 0;
	let score = 1;
	if (password.length >= 12) score++;
	if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
	if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
	return Math.min(score, 4);
}
