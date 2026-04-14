import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import "./index.css";

const HomePage = lazy(() => import("./pages/HomePage"));
const SocialLayout = lazy(() => import("./pages/social/SocialLayout"));
const SocialDashboard = lazy(() => import("./pages/social/SocialDashboard"));
const ProfilePage = lazy(() => import("./pages/social/ProfilePage"));
const AppsPage = lazy(() => import("./pages/social/AppsPage"));
const FeedPage = lazy(() => import("./pages/social/FeedPage"));
const GraphPage = lazy(() => import("./pages/social/GraphPage"));

const routeFallback = (
	<div className="flex items-center justify-center py-20">
		<div className="w-6 h-6 border-2 border-polka-500/30 border-t-polka-500 rounded-full animate-spin" />
	</div>
);

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<HashRouter>
			<Routes>
				<Route element={<App />}>
					<Route
						index
						element={
							<Suspense fallback={routeFallback}>
								<HomePage />
							</Suspense>
						}
					/>
					<Route
						path="social"
						element={
							<Suspense fallback={routeFallback}>
								<SocialLayout />
							</Suspense>
						}
					>
						<Route
							index
							element={
								<Suspense fallback={routeFallback}>
									<SocialDashboard />
								</Suspense>
							}
						/>
						<Route
							path="profile"
							element={
								<Suspense fallback={routeFallback}>
									<ProfilePage />
								</Suspense>
							}
						/>
						<Route
							path="apps"
							element={
								<Suspense fallback={routeFallback}>
									<AppsPage />
								</Suspense>
							}
						/>
						<Route
							path="feed"
							element={
								<Suspense fallback={routeFallback}>
									<FeedPage />
								</Suspense>
							}
						/>
						<Route
							path="graph"
							element={
								<Suspense fallback={routeFallback}>
									<GraphPage />
								</Suspense>
							}
						/>
					</Route>
				</Route>
			</Routes>
		</HashRouter>
	</StrictMode>,
);
