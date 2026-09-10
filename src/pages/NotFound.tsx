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
		<div className="flex min-h-dvh flex-col items-center justify-center bg-muted/40 px-5 text-center">
			<Logo className="self-center" />
			<p className="mt-10 font-display text-7xl font-bold text-primary">404</p>
			<h1 className="mt-2 font-display text-2xl font-bold">{t("notFound.title")}</h1>
			<p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("notFound.body")}</p>
			<div className="mt-8 flex gap-2">
				<Button variant="outline" className="h-11" onClick={() => navigate(-1)}>
					<ArrowLeft className="h-4 w-4" />
					{t("notFound.back")}
				</Button>
				<Button className="h-11" asChild>
					<Link to="/">{t("notFound.home")}</Link>
				</Button>
			</div>
		</div>
	);
};

export default NotFound;
