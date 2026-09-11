import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

const NotFound = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	useEffect(() => {
		document.title = `${t("notFound.title")} · Style2Fit`;
	}, [t]);

	return (
		<div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 text-center">
			<Link to="/" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
				<Logo />
			</Link>
			<p className="mt-12 font-display text-8xl leading-none text-accent/50">404</p>
			<h1 className="mt-4 font-display text-3xl">{t("notFound.title")}</h1>
			<p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{t("notFound.body")}</p>
			<div className="mt-8 flex flex-wrap justify-center gap-2">
				<Button variant="outline" className="h-12 rounded-full bg-card px-6" onClick={() => navigate(-1)}>
					<ArrowLeft className="h-4 w-4" />
					{t("notFound.back")}
				</Button>
				<Button className="h-12 rounded-full px-6" asChild>
					<Link to="/">{t("notFound.home")}</Link>
				</Button>
			</div>
		</div>
	);
};

export default NotFound;
