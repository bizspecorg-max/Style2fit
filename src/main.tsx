import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";

// Configure React Query for better performance and caching
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 minutes – data considered fresh
			gcTime: 1000 * 60 * 10, // 10 minutes garbage collection
			refetchOnWindowFocus: false, // don't refetch when switching tabs
			retry: 1, // retry failed queries once
		},
	},
});

createRoot(document.getElementById("root")!).render(
	<QueryClientProvider client={queryClient}>
		<App />
	</QueryClientProvider>
);
