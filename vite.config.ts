import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
	server: {
		host: "::",
		port: 8080,
		hmr: {
			overlay: false,
		},
	},
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
		dedupe: [
			"react",
			"react-dom",
			"react/jsx-runtime",
			"react/jsx-dev-runtime",
			"@tanstack/react-query",
			"@tanstack/query-core",
		],
	},
	build: {
		outDir: "dist",
		// Big libraries in their own long-cached files; a screen change doesn't re-download them.
		rollupOptions: {
			output: {
				manualChunks: {
					react: ["react", "react-dom", "react-router-dom"],
					supabase: ["@supabase/supabase-js"],
					query: ["@tanstack/react-query"],
					i18n: ["i18next", "react-i18next"],
					radix: [
						"@radix-ui/react-dialog",
						"@radix-ui/react-alert-dialog",
						"@radix-ui/react-dropdown-menu",
						"@radix-ui/react-select",
						"@radix-ui/react-tabs",
						"@radix-ui/react-tooltip",
						"@radix-ui/react-toast",
					],
				},
			},
		},
	},
});
