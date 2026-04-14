import { useState, useRef } from "react";
import { useIpfs } from "../../hooks/social/useIpfs";

export interface AppMetadata {
	name: string;
	description: string;
	icon: string; // IPFS CID of icon image
	website: string;
}

interface AppFormProps {
	onSubmit: (cid: string) => void;
	disabled?: boolean;
}

export default function AppForm({ onSubmit, disabled }: AppFormProps) {
	const { uploadImage, uploadProfileMetadata, ipfsUrl } = useIpfs();
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [iconCid, setIconCid] = useState("");
	const [website, setWebsite] = useState("");
	const [uploadingIcon, setUploadingIcon] = useState(false);
	const [uploadingMeta, setUploadingMeta] = useState(false);
	const [iconError, setIconError] = useState<string | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	async function handleIconSelect(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith("image/")) { setIconError("Select an image file."); return; }
		if (file.size > 2 * 1024 * 1024) { setIconError("Image must be under 2MB."); return; }

		setIconError(null);
		setUploadingIcon(true);
		try {
			const cid = await uploadImage(file);
			setIconCid(cid);
		} catch (err) {
			setIconError(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setUploadingIcon(false);
			if (fileRef.current) fileRef.current.value = "";
		}
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;

		setUploadingMeta(true);
		try {
			const metadata: AppMetadata = {
				name: name.trim(),
				description: description.trim(),
				icon: iconCid,
				website: website.trim(),
			};
			// Reuse uploadProfileMetadata — it just uploads JSON to IPFS
			const cid = await uploadProfileMetadata(metadata as never);
			onSubmit(cid);
		} finally {
			setUploadingMeta(false);
		}
	}

	const iconPreview = iconCid ? ipfsUrl(iconCid) : "";
	const busy = disabled || uploadingIcon || uploadingMeta;

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{/* Icon */}
			<div>
				<label className="form-label">App Icon</label>
				<div className="flex items-center gap-4">
					{iconPreview ? (
						<img src={iconPreview} alt="Icon" className="w-14 h-14 rounded-xl object-cover bg-surface-800 shrink-0" />
					) : (
						<div className="w-14 h-14 rounded-xl bg-surface-800 flex items-center justify-center shrink-0">
							<svg className="w-6 h-6 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
							</svg>
						</div>
					)}
					<div className="space-y-2">
						<input ref={fileRef} type="file" accept="image/*" onChange={handleIconSelect} className="hidden" />
						<button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingIcon} className="btn-outline btn-sm">
							{uploadingIcon ? "Uploading..." : "Upload Icon"}
						</button>
						{iconCid && (
							<button type="button" onClick={() => setIconCid("")} className="btn-ghost btn-sm text-danger">Remove</button>
						)}
						{iconError && <p className="text-xs text-danger">{iconError}</p>}
					</div>
				</div>
				<style>{`html.light .bg-surface-800 { background: #f4f4f5; }`}</style>
			</div>

			<div>
				<label className="form-label">App Name *</label>
				<input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Social App" className="input" required />
			</div>

			<div>
				<label className="form-label">Description</label>
				<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does your app do?" rows={3} className="input resize-none" />
			</div>

			<div>
				<label className="form-label">Website</label>
				<input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="input" />
			</div>

			<button type="submit" disabled={!name.trim() || busy} className="btn-brand w-full">
				{uploadingMeta ? "Uploading to IPFS..." : "Register App"}
			</button>
		</form>
	);
}
