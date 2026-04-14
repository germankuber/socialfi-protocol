import { useState } from "react";
import type { ProfileMetadata } from "../../hooks/social/useIpfs";

interface ProfileFormProps {
	initial?: ProfileMetadata;
	onSubmit: (metadata: ProfileMetadata) => void;
	submitLabel: string;
	disabled?: boolean;
}

export default function ProfileForm({ initial, onSubmit, submitLabel, disabled }: ProfileFormProps) {
	const [name, setName] = useState(initial?.name ?? "");
	const [bio, setBio] = useState(initial?.bio ?? "");
	const [avatar, setAvatar] = useState(initial?.avatar ?? "");
	const [twitter, setTwitter] = useState(initial?.links?.twitter ?? "");
	const [github, setGithub] = useState(initial?.links?.github ?? "");
	const [website, setWebsite] = useState(initial?.links?.website ?? "");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;

		const links: Record<string, string> = {};
		if (twitter.trim()) links.twitter = twitter.trim();
		if (github.trim()) links.github = github.trim();
		if (website.trim()) links.website = website.trim();

		onSubmit({ name: name.trim(), bio: bio.trim(), avatar: avatar.trim(), links });
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label className="form-label">Display Name *</label>
				<input
					type="text"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Your name..."
					className="input"
					required
				/>
			</div>

			<div>
				<label className="form-label">Bio</label>
				<textarea
					value={bio}
					onChange={(e) => setBio(e.target.value)}
					placeholder="Tell people about yourself..."
					rows={3}
					className="input resize-none"
				/>
			</div>

			<div>
				<label className="form-label">Avatar URL</label>
				<input
					type="text"
					value={avatar}
					onChange={(e) => setAvatar(e.target.value)}
					placeholder="https://... or ipfs://..."
					className="input"
				/>
				{avatar && (
					<div className="mt-2 flex items-center gap-3">
						<img
							src={avatar}
							alt="Avatar preview"
							className="w-12 h-12 rounded-full object-cover bg-surface-800"
							onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
						/>
						<span className="text-xs text-secondary">Preview</span>
					</div>
				)}
			</div>

			<div className="space-y-3">
				<p className="form-label">Links</p>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div>
						<label className="text-[10px] text-surface-500 uppercase tracking-wider mb-1 block">Twitter</label>
						<input
							type="text"
							value={twitter}
							onChange={(e) => setTwitter(e.target.value)}
							placeholder="@handle"
							className="input"
						/>
					</div>
					<div>
						<label className="text-[10px] text-surface-500 uppercase tracking-wider mb-1 block">GitHub</label>
						<input
							type="text"
							value={github}
							onChange={(e) => setGithub(e.target.value)}
							placeholder="username"
							className="input"
						/>
					</div>
					<div>
						<label className="text-[10px] text-surface-500 uppercase tracking-wider mb-1 block">Website</label>
						<input
							type="text"
							value={website}
							onChange={(e) => setWebsite(e.target.value)}
							placeholder="https://..."
							className="input"
						/>
					</div>
				</div>
			</div>

			<button
				type="submit"
				disabled={!name.trim() || disabled}
				className="btn-brand w-full"
			>
				{disabled ? "Uploading to IPFS..." : submitLabel}
			</button>
		</form>
	);
}
