import type { StorageStatus } from "@/lib/data/jsonStorage";

type StorageBannerProps = {
  status: StorageStatus;
};

export default function StorageBanner({ status }: StorageBannerProps) {
  if (!status.warning) return null;

  return (
    <div className="studio-alert studio-alert--warn" role="status">
      <strong>Storage setup required.</strong> {status.warning}
      <ol
        style={{
          margin: "0.65rem 0 0",
          paddingLeft: "1.25rem",
          fontSize: "0.9rem",
          lineHeight: 1.5,
        }}
      >
        <li>Open your Vercel project → <strong>Storage</strong></li>
        <li>
          Create <strong>Blob</strong> <em>or</em> <strong>Neon Postgres</strong> and connect
          it to this app
        </li>
        <li>
          <strong>Redeploy</strong> the latest commit from GitHub
        </li>
        <li>
          Verify <code>/api/health</code> shows{" "}
          <code>storagePersistent: true</code>
        </li>
      </ol>
    </div>
  );
}
