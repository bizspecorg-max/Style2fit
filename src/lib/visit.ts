// Remembers (on this device) that someone has used the app, so "/" takes them to sign-in instead of the landing page.
const KEY = "s2f-returning";

export function markReturning() {
	try {
		localStorage.setItem(KEY, "1");
	} catch {
		// Storage blocked — they'll just see the landing page.
	}
}

export function isReturning() {
	try {
		return localStorage.getItem(KEY) === "1";
	} catch {
		return false;
	}
}
