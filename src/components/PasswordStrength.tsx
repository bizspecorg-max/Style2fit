import { useTranslation } from "react-i18next";
import { MIN_PASSWORD_LENGTH, passwordScore } from "@/lib/password";
import { cn } from "@/lib/utils";

const TONES = ["bg-destructive", "bg-destructive", "bg-warning", "bg-success", "bg-success"];

export function PasswordStrength({ password, id }: { password: string; id: string }) {
	const { t } = useTranslation();
	const score = passwordScore(password);

	return (
		<div id={id} className="space-y-1.5" aria-live="polite">
			<div className="flex gap-1" aria-hidden>
				{[1, 2, 3, 4].map((step) => (
					<span
						key={step}
						className={cn(
							"h-1.5 flex-1 rounded-full bg-muted transition-colors",
							password && step <= Math.max(score, 1) && TONES[score]
						)}
					/>
				))}
			</div>
			<p className="text-xs text-muted-foreground">
				{password ? t(`password.strength.${score}`) : t("password.hint", { min: MIN_PASSWORD_LENGTH })}
			</p>
		</div>
	);
}
