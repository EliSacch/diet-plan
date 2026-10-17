import "./Loader.css";

export default function Loader({ label }: { label: string }) {
  return (
    <div className="loader" role="status" aria-label={label}>
      <span className="loader-spinner" aria-hidden="true" />
      <span className="loader-label">{label}</span>
    </div>
  );
}
