"use client";
import { RiverMark } from "@/components/primitives";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="error-page">
      <RiverMark size={48} />
      <h1>A moment away from the table.</h1>
      <p>Something interrupted the view. Your confirmed hands are saved.</p>
      <button className="button button-dark" onClick={reset}>
        Return to the table
      </button>
    </div>
  );
}
