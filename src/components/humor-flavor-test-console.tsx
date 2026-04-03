"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TestImage = {
  id: string;
  url: string | null;
  description: string | null;
  isCommonUse: boolean | null;
};

type TestResult = {
  imageId: string;
  imageUrl: string | null;
  description: string | null;
  captions: string[];
  error: string | null;
};

function parseResponseBody(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

type HumorFlavorTestConsoleProps = {
  flavorId: string;
  flavorName: string;
  images: TestImage[];
  apiBaseUrl: string;
  flavorParamKey: string;
};

function parseErrorMessage(statusFallback: string, payload: unknown) {
  if (typeof payload === "string" && payload.trim().length > 0) {
    if (payload.includes("not valid JSON") || payload.includes("Unexpected token")) {
      return `${payload} The API is rejecting this flavor's output format. Make sure the final humor-flavor step returns strict JSON, not plain text.`;
    }
    return payload;
  }

  if (payload && typeof payload === "object" && "message" in payload) {
    const value = payload.message;
    if (typeof value === "string" && value.trim().length > 0) {
      if (value.includes("not valid JSON") || value.includes("Unexpected token")) {
        return `${value} The API is rejecting this flavor's output format. Make sure the final humor-flavor step returns strict JSON, not plain text.`;
      }
      return value;
    }
  }

  return statusFallback;
}

function extractCaptions(payload: unknown) {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return [payload.trim()];
  }

  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && "captions" in payload && Array.isArray(payload.captions)
      ? payload.captions
      : [];

  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const caption = "content" in row ? row.content : "caption" in row ? row.caption : "text" in row ? row.text : null;
      return typeof caption === "string" && caption.trim().length > 0 ? caption.trim() : null;
    })
    .filter((caption): caption is string => Boolean(caption));
}

export default function HumorFlavorTestConsole({
  flavorId,
  flavorName,
  images,
  apiBaseUrl,
  flavorParamKey,
}: HumorFlavorTestConsoleProps) {
  const defaultSelection = useMemo(() => images.slice(0, Math.min(images.length, 3)).map((image) => image.id), [images]);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>(defaultSelection);
  const [results, setResults] = useState<TestResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleImage(imageId: string) {
    setSelectedImageIds((current) =>
      current.includes(imageId) ? current.filter((id) => id !== imageId) : [...current, imageId],
    );
  }

  async function handleRun() {
    setError(null);
    setResults([]);

    if (selectedImageIds.length === 0) {
      setError("Select at least one image from the test set.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error("You must be signed in with Google to run the caption test.");
      }

      const nextResults: TestResult[] = [];

      for (const imageId of selectedImageIds) {
        const image = images.find((item) => item.id === imageId) ?? null;
        const payload: Record<string, unknown> = { imageId };
        payload[flavorParamKey] = flavorId;

        const response = await fetch(`${apiBaseUrl}/pipeline/generate-captions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const rawBody = await response.text();
        const responseBody = parseResponseBody(rawBody);
        if (!response.ok) {
          nextResults.push({
            imageId,
            imageUrl: image?.url ?? null,
            description: image?.description ?? null,
            captions: [],
            error: parseErrorMessage(`Request failed with status ${response.status}.`, responseBody),
          });
          continue;
        }

        nextResults.push({
          imageId,
          imageUrl: image?.url ?? null,
          description: image?.description ?? null,
          captions: extractCaptions(responseBody),
          error: null,
        });
      }

      setResults(nextResults);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to run caption test.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-[var(--surface)] p-6 shadow-[0_18px_50px_-38px_rgba(0,0,0,0.45)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted-foreground)]">Image Test Set</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Run {flavorName} against the API</h3>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
            This sends the selected image IDs to <code>{apiBaseUrl}/pipeline/generate-captions</code> using the logged-in
            user&apos;s Supabase access token.
          </p>
        </div>

        <button
          className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          onClick={handleRun}
          type="button"
        >
          {isSubmitting ? "Generating..." : "Run Flavor Test"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {images.map((image) => {
          const selected = selectedImageIds.includes(image.id);

          return (
            <label
              className={`block cursor-pointer overflow-hidden rounded-[1.4rem] border p-3 transition ${
                selected
                  ? "border-[color:var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[color:var(--border)] bg-[var(--surface-muted)]"
              }`}
              key={image.id}
            >
              <input
                checked={selected}
                className="sr-only"
                onChange={() => toggleImage(image.id)}
                type="checkbox"
              />
              {image.url ? (
                <div className="flex h-40 w-full items-center justify-center rounded-[1rem] bg-[var(--surface-strong)] p-2">
                  <img alt={image.description ?? `Image ${image.id}`} className="h-full w-full rounded-[0.85rem] object-contain" src={image.url} />
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center rounded-[1rem] bg-[var(--surface-strong)] text-sm text-[var(--muted-foreground)]">
                  Image preview unavailable
                </div>
              )}
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">Image {image.id}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">{image.description ?? "No description saved."}</p>
                </div>
                {image.isCommonUse ? (
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]">
                    Common Use
                  </span>
                ) : null}
              </div>
            </label>
          );
        })}
      </div>

      <div className="mt-4 rounded-[1.2rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4 text-sm leading-7 text-[var(--muted-foreground)]">
        Select one or more images, run the flavor, then compare the returned captions against the ordered steps you wrote above. If the output is off, revise the prompts or the `order_by` sequence and test again.
        The final caption-writing step must return strict JSON if the backend parser expects JSON-formatted captions.
      </div>

      {error ? (
        <p className="mt-4 rounded-[1.4rem] border border-[color:var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--foreground)]">
          {error}
        </p>
      ) : null}

      {results.length > 0 ? (
        <div className="mt-6 space-y-4">
          {results.map((result) => (
            <article className="rounded-[1.5rem] border border-[color:var(--border)] bg-[var(--surface-muted)] p-4" key={result.imageId}>
              <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                  {result.imageUrl ? (
                    <div className="flex h-44 w-full items-center justify-center rounded-[1rem] bg-[var(--surface-strong)] p-2">
                      <img alt={result.description ?? `Image ${result.imageId}`} className="h-full w-full rounded-[0.85rem] object-contain" src={result.imageUrl} />
                    </div>
                  ) : (
                    <div className="flex h-44 items-center justify-center rounded-[1rem] bg-[var(--surface-strong)] text-sm text-[var(--muted-foreground)]">
                      No preview
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Result for image {result.imageId}</p>
                  {result.error ? (
                    <p className="mt-3 rounded-[1rem] border border-[color:var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--foreground)]">
                      {result.error}
                    </p>
                  ) : result.captions.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {result.captions.map((caption, index) => (
                        <p className="rounded-[1rem] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)]" key={`${result.imageId}-${index}`}>
                          {caption}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                      The request completed, but no caption text was returned in the payload.
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
