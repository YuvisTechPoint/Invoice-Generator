import type { StorageStatus } from "@/lib/data/jsonStorage";

type StorageBannerProps = {
  status: StorageStatus;
};

export default function StorageBanner({ status }: StorageBannerProps) {
  if (!status.warning) return null;

  return (
    <div className="studio-alert studio-alert--warn" role="status">
      <strong>Storage setup required.</strong> {status.warning}
      <span style={{ display: "block", marginTop: "0.35rem", fontSize: "0.9rem" }}>
        Vercel dashboard → <em>Storage</em> → <em>Create Blob</em> → connect to this
        project → <em>Redeploy</em>.
      </span>
    </div>
  );
}
