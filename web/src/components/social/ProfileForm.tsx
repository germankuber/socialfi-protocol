import { useState, useRef } from "react";
import type { ProfileMetadata } from "../../hooks/social/useIpfs";
import { useIpfs } from "../../hooks/social/useIpfs";

interface ProfileFormProps {
	initial?: ProfileMetadata;
	onSubmit: (metadata: ProfileMetadata) => void;
	submitLabel: string;
	disabled?: boolean;
}

export default function ProfileForm({ initial, onSubmit, submitLabel, disabled }: ProfileFormProps) {
	const { uploadImage, ipfsUrl } = useIpfs();
	const [name, setName] = useState(initial?.name ?? "");
	const [bio, setBio] = useState(initial?.bio ?? "");
	const [avatarCid, setAvatarCid] = useState(initial?.avatar ?? "");
	const [twitter, setTwitter] = useState(initial?.links?.twitter ?? "");
	const [github, setGithub] = useState(initial?.links?.github ?? "");
	const [website, setWebsite] = useState(initial?.links?.website ?? "");
	const [uploadingImage, setUploadingImage] = useState(false);
	const [imageError, setImageError] = useState<string | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			setImageError("Please select an image file.");
			return;
		}
		if (file.size > 5 * 1024 * 1024) {
			setImageError("Image must be under 5MB.");
			return;
		}

		setImageError(null);
		setUploadingImage(true);
		try {
			const cid = await uploadImage(file);
			setAvatarCid(cid);
		} catch (err) {
			setImageError(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setUploadingImage(false);
			if (fileRef.current) fileRef.current.value = "";
		}
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;

		const links: Record<string, string> = {};
		if (twitter.trim()) links.twitter = twitter.trim();
		if (github.trim()) links.github = github.trim();
		if (website.trim()) links.website = website.trim();

		onSubmit({ name: name.trim(), bio: bio.trim(), avatar: avatarCid, links });
	}

	const avatarPreviewUrl = avatarCid ? ipfsUrl(avatarCid) : "";

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{/* Avatar */}
			<div>
				<label className="form-label">Avatar</label>
				<div className="flex items-center gap-4">
					{avatarPreviewUrl ? (
						<img
							src={avatarPreviewUrl}
							alt="Avatar"
							className="w-16 h-16 rounded-full object-cover bg-surface-800 shrink-0"
							onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
						/>
					) : (
						<div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center shrink-0">
							<svg className="w-6 h-6 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
						</div>
					)}
					<div className="space-y-2">
						<input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
						<button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingImage} className="btn-outline btn-sm">
							{uploadingImage ? (
								<span className="flex items-center gap-2">
									<span className="w-3 h-3 border-2 border-surface-600 border-t-brand-500 rounded-full animate-spin" />
									Uploading to IPFS...
								</span>
							) : "Upload Image"}
						</button>
						{avatarCid && (
							<button type="button" onClick={() => setAvatarCid("")} className="btn-ghost btn-sm text-danger">
								Remove
							</button>
						)}
						{avatarCid && (
							<p className="text-[10px] font-mono text-surface-500 truncate max-w-[200px]">{avatarCid}</p>
						)}
						{imageError && <p className="text-xs text-danger">{imageError}</p>}
					</div>
				</div>
				<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
			</div>

			<div>
				<label className="form-label">Display Name *</label>
				<input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name..." className="input" required />
			</div>

			<div>
				<label className="form-label">Bio</label>
				<textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell people about yourself..." rows={3} className="input resize-none" />
			</div>

			<div className="space-y-3">
				<p className="form-label">Links</p>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div>
						<label className="text-[10px] text-surface-500 uppercase tracking-wider mb-1 block">Twitter</label>
						<input type="text" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="@handle" className="input" />
					</div>
					<div>
						<label className="text-[10px] text-surface-500 uppercase tracking-wider mb-1 block">GitHub</label>
						<input type="text" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="username" className="input" />
					</div>
					<div>
						<label className="text-[10px] text-surface-500 uppercase tracking-wider mb-1 block">Website</label>
						<input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="input" />
					</div>
				</div>
			</div>

			<button type="submit" disabled={!name.trim() || disabled || uploadingImage} className="btn-brand w-full">
				{disabled ? "Uploading to IPFS..." : submitLabel}
			</button>
		</form>
	);
}
