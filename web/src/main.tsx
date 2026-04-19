import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import "./index.css";

const HomePage = lazy(() => import("./pages/HomePage"));
const PeoplePage = lazy(() => import("./pages/PeoplePage"));
const ProtocolStatsPage = lazy(() => import("./pages/ProtocolStatsPage"));
const SocialLayout = lazy(() => import("./pages/social/SocialLayout"));
const SocialDashboard = lazy(() => import("./pages/social/SocialDashboard"));
const ProfilePage = lazy(() => import("./pages/social/ProfilePage"));
const AppsPage = lazy(() => import("./pages/social/AppsPage"));
const FeedPage = lazy(() => import("./pages/social/FeedPage"));
const GraphPage = lazy(() => import("./pages/social/GraphPage"));
const TransactionsPage = lazy(() => import("./pages/social/TransactionsPage"));
const AppDetailPage = lazy(() => import("./pages/social/AppDetailPage"));
const PostDetailPage = lazy(() => import("./pages/social/PostDetailPage"));
const PublicProfilePage = lazy(() => import("./pages/social/PublicProfilePage"));
const EditProfilePage = lazy(() => import("./pages/social/EditProfilePage"));
const CreateProfilePage = lazy(() => import("./pages/social/CreateProfilePage"));
const AccountsPage = lazy(() => import("./pages/social/AccountsPage"));
const ManagersPage = lazy(() => import("./pages/social/ManagersPage"));

const routeFallback = (
	<div className="flex items-center justify-center py-20">
		<div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
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
						path="people"
						element={
							<Suspense fallback={routeFallback}>
								<PeoplePage />
							</Suspense>
						}
					/>
					<Route
						path="protocol"
						element={
							<Suspense fallback={routeFallback}>
								<ProtocolStatsPage />
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
						<Route
							path="transactions"
							element={
								<Suspense fallback={routeFallback}>
									<TransactionsPage />
								</Suspense>
							}
						/>
						<Route
							path="accounts"
							element={
								<Suspense fallback={routeFallback}>
									<AccountsPage />
								</Suspense>
							}
						/>
						<Route
							path="managers"
							element={
								<Suspense fallback={routeFallback}>
									<ManagersPage />
								</Suspense>
							}
						/>
					</Route>
					{/* App detail — standalone, no social tabs */}
					<Route
						path="app/:appId"
						element={
							<Suspense fallback={routeFallback}>
								<AppDetailPage />
							</Suspense>
						}
					/>
					{/* Post detail — standalone, shareable URL */}
					<Route
						path="post/:postId"
						element={
							<Suspense fallback={routeFallback}>
								<PostDetailPage />
							</Suspense>
						}
					/>
					{/* Public profile — standalone */}
					<Route
						path="profile/:address"
						element={
							<Suspense fallback={routeFallback}>
								<PublicProfilePage />
							</Suspense>
						}
					/>
					{/* Edit profile — standalone */}
					<Route
						path="profile/edit"
						element={
							<Suspense fallback={routeFallback}>
								<EditProfilePage />
							</Suspense>
						}
					/>
					{/* Create profile — standalone, no social tabs */}
					<Route
						path="create-profile"
						element={
							<Suspense fallback={routeFallback}>
								<CreateProfilePage />
							</Suspense>
						}
					/>
				</Route>
			</Routes>
		</HashRouter>
	</StrictMode>,
);
