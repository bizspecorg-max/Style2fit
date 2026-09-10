import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Password input with an accessible show / hide toggle. */
export function PasswordField({
	id,
	value,
	onChange,
	autoComplete,
	describedBy,
	invalid,
}: {
	id: string;
	value: string;
	onChange: (value: string) => void;
	autoComplete: string;
	describedBy?: string;
	invalid?: boolean;
}) {
	const { t } = useTranslation();
	const [visible, setVisible] = useState(false);
	return (
		<div className="relative">
			<Input
				id={id}
				type={visible ? "text" : "password"}
				autoComplete={autoComplete}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				aria-describedby={describedBy}
				aria-invalid={invalid || undefined}
				className="h-12 pr-12"
			/>
			<button
				type="button"
				onClick={() => setVisible((v) => !v)}
				aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
				aria-pressed={visible}
				className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
			</button>
		</div>
	);
}
