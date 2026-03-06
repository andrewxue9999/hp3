import { createAdminClient } from "@/lib/supabase/admin";
import {
  asNumber,
  formatCompactNumber,
  formatDateOnly,
  formatPercent,
  getCaptionText,
  getImageUrl,
  getProfileName,
  getRowDate,
  getRowId,
  type GenericRow,
} from "@/lib/admin/data";

type CaptionScore = {
  id: string;
  upvotes: number;
  downvotes: number;
  score: number;
  controversy: number;
};

function getAuthorId(row: GenericRow) {
  return (
    getRowId({ id: row.author_id }) ??
    getRowId({ id: row.profile_id }) ??
    getRowId({ id: row.user_id })
  );
}

function getImageId(row: GenericRow) {
  return getRowId({ id: row.image_id });
}

function getCoverageImageUrl(caption: GenericRow, imageMap: Map<string, GenericRow>) {
  const joinedImage = imageMap.get(getImageId(caption) ?? "");
  return getImageUrl(joinedImage ?? {}) ?? getImageUrl(caption);
}

function buildDailySeries(rows: GenericRow[], label: string) {
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: formatDateOnly(date),
      count: 0,
    };
  });

  const map = new Map(days.map((day) => [day.key, day]));

  for (const row of rows) {
    const date = getRowDate(row);
    if (!date) continue;
    const key = date.toISOString().slice(0, 10);
    const current = map.get(key);
    if (current) {
      current.count += 1;
    }
  }

  return {
    label,
    points: days,
    max: Math.max(...days.map((day) => day.count), 1),
  };
}

export default async function AdminDashboardPage() {
  const admin = createAdminClient();

  const [
    { data: captionRows = [], error: captionError },
    { data: voteRows = [], error: voteError },
    { data: imageRows = [], error: imageError },
    { data: profileRows = [], error: profileError },
  ] = await Promise.all([
    admin.from("captions").select("*"),
    admin.from("caption_votes").select("*"),
    admin.from("images").select("*"),
    admin.from("profiles").select("*"),
  ]);

  if (captionError || voteError || imageError || profileError) {
    throw new Error(
      captionError?.message ??
        voteError?.message ??
        imageError?.message ??
        profileError?.message ??
        "Unable to load admin dashboard.",
    );
  }

  const captions = captionRows as GenericRow[];
  const votes = voteRows as GenericRow[];
  const images = imageRows as GenericRow[];
  const profiles = profileRows as GenericRow[];

  const imageMap = new Map(images.map((row) => [getRowId(row) ?? "", row]));
  const profileMap = new Map(profiles.map((row) => [getRowId(row) ?? "", row]));

  const captionScores = new Map<string, CaptionScore>();
  let totalUpvotes = 0;
  let totalDownvotes = 0;

  for (const vote of votes) {
    const captionId = getRowId({ id: vote.caption_id });
    const voteValue = asNumber(vote.vote_value);
    if (!captionId || voteValue === null) continue;

    const current = captionScores.get(captionId) ?? {
      id: captionId,
      upvotes: 0,
      downvotes: 0,
      score: 0,
      controversy: 0,
    };

    if (voteValue > 0) {
      current.upvotes += 1;
      current.score += 1;
      totalUpvotes += 1;
    } else if (voteValue < 0) {
      current.downvotes += 1;
      current.score -= 1;
      totalDownvotes += 1;
    }

    current.controversy = Math.min(current.upvotes, current.downvotes) * 2;
    captionScores.set(captionId, current);
  }

  const totalVotes = totalUpvotes + totalDownvotes;
  const approvalRatio = totalVotes === 0 ? 0 : totalUpvotes / totalVotes;
  const rejectionRatio = totalVotes === 0 ? 0 : totalDownvotes / totalVotes;
  const avgVotesPerCaption = captions.length === 0 ? 0 : totalVotes / captions.length;

  const captionPerformance = captions
    .map((caption) => {
      const captionId = getRowId(caption);
      const score = captionId ? captionScores.get(captionId) : undefined;
      return {
        caption,
        score: score ?? {
          id: captionId ?? "missing",
          upvotes: 0,
          downvotes: 0,
          score: 0,
          controversy: 0,
        },
      };
    })
    .sort((left, right) => {
      if (right.score.score !== left.score.score) {
        return right.score.score - left.score.score;
      }

      return right.score.upvotes - left.score.upvotes;
    });

  const mostLoved = captionPerformance[0];
  const mostControversial = [...captionPerformance].sort(
    (left, right) => right.score.controversy - left.score.controversy,
  )[0];

  const contributorStats = new Map<
    string,
    { id: string; captions: number; netScore: number; votes: number }
  >();

  for (const caption of captions) {
    const authorId = getAuthorId(caption);
    if (!authorId) continue;

    const current = contributorStats.get(authorId) ?? {
      id: authorId,
      captions: 0,
      netScore: 0,
      votes: 0,
    };

    const captionId = getRowId(caption);
    const score = captionId ? captionScores.get(captionId) : undefined;
    current.captions += 1;
    current.netScore += score?.score ?? 0;
    current.votes += (score?.upvotes ?? 0) + (score?.downvotes ?? 0);
    contributorStats.set(authorId, current);
  }

  const topContributors = [...contributorStats.values()]
    .sort((left, right) => {
      if (right.netScore !== left.netScore) return right.netScore - left.netScore;
      return right.captions - left.captions;
    })
    .slice(0, 5);

  const freshImages = buildDailySeries(images, "Images");
  const freshCaptions = buildDailySeries(captions, "Captions");
  const freshVotes = buildDailySeries(votes, "Votes");

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,_rgba(34,211,238,0.2),_rgba(15,23,42,0.52)_38%,_rgba(251,191,36,0.14))] shadow-[0_30px_80px_-48px_rgba(34,211,238,0.7)]">
        <div className="relative p-7 xl:p-8">
          <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="absolute bottom-0 right-16 h-32 w-32 rounded-full bg-amber-300/10 blur-3xl" />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-100/75">Statistics Dashboard</p>
              <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-200">
                Live Admin Pulse
              </span>
            </div>

            <div className="mt-5 max-w-5xl space-y-4">
              <h2 className="text-4xl font-semibold leading-tight tracking-tight text-white xl:text-[3.35rem]">
                Pulse of the meme database
              </h2>
              <p className="text-base leading-8 text-slate-200 xl:max-w-4xl xl:text-[1.02rem]">
                This view blends voting health, contributor output, and recent content velocity so an admin can spot
                quality drift, oversupply, or unusually divisive caption batches fast.
              </p>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300">Upvotes</p>
                <p className="mt-2 text-2xl font-semibold text-white xl:text-[2rem]">{formatCompactNumber(totalUpvotes)}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300">Downvotes</p>
                <p className="mt-2 text-2xl font-semibold text-white xl:text-[2rem]">{formatCompactNumber(totalDownvotes)}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300">Approval</p>
                <p className="mt-2 text-2xl font-semibold text-white xl:text-[2rem]">{formatPercent(approvalRatio)}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-300">Votes / Caption</p>
                <p className="mt-2 text-2xl font-semibold text-white xl:text-[2rem]">{avgVotesPerCaption.toFixed(1)}</p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/28 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300">Total Vote Flow</p>
                <p className="mt-2 text-lg font-semibold text-white">{formatCompactNumber(totalVotes)}</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/28 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300">Caption Inventory</p>
                <p className="mt-2 text-lg font-semibold text-white">{formatCompactNumber(captions.length)}</p>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/28 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-300">Profile Footprint</p>
                <p className="mt-2 text-lg font-semibold text-white">{formatCompactNumber(profiles.length)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-100/65">Vote Balance</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Sentiment split</h3>
            </div>
            <div className="text-right text-sm text-slate-300">
              <p>Total votes</p>
              <p className="mt-1 text-2xl font-semibold text-white">{formatCompactNumber(totalVotes)}</p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-full border border-white/10 bg-slate-950/60">
            <div className="flex h-6">
              <div className="bg-gradient-to-r from-cyan-300 to-emerald-300" style={{ width: `${approvalRatio * 100}%` }} />
              <div className="bg-gradient-to-r from-amber-300 to-rose-300" style={{ width: `${rejectionRatio * 100}%` }} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.4rem] border border-cyan-300/20 bg-cyan-300/8 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/70">Upvote Ratio</p>
              <p className="mt-2 text-3xl font-semibold text-white">{formatPercent(approvalRatio)}</p>
              <p className="mt-2 text-sm text-slate-300">Audience agrees more often than it rejects.</p>
            </div>
            <div className="rounded-[1.4rem] border border-rose-300/20 bg-rose-300/8 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-rose-100/70">Downvote Ratio</p>
              <p className="mt-2 text-3xl font-semibold text-white">{formatPercent(rejectionRatio)}</p>
              <p className="mt-2 text-sm text-slate-300">Use this as a warning light for stale or misaligned caption batches.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-amber-100/65">Inventory Snapshot</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">What exists right now</h3>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.3rem] border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Images</p>
              <p className="mt-2 text-3xl font-semibold text-white">{formatCompactNumber(images.length)}</p>
            </div>
            <div className="rounded-[1.3rem] border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Captions</p>
              <p className="mt-2 text-3xl font-semibold text-white">{formatCompactNumber(captions.length)}</p>
            </div>
            <div className="rounded-[1.3rem] border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Profiles</p>
              <p className="mt-2 text-3xl font-semibold text-white">{formatCompactNumber(profiles.length)}</p>
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">Quality heuristic</p>
            <p className="mt-2">
              Large caption inventory with weak vote density usually means you are generating faster than you are learning.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-100/65">Highlights</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Best and most divisive captions</h3>

          <div className="mt-5 space-y-4">
            {[{ label: "Most Loved", item: mostLoved }, { label: "Most Controversial", item: mostControversial }].map(
              ({ label, item }) =>
                item ? (
                  <article className="rounded-[1.5rem] border border-white/10 bg-slate-950/40 p-4" key={label}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
                        <p className="mt-2 text-lg font-medium text-white">
                          {getCaptionText(item.caption) ?? "Caption text unavailable"}
                        </p>
                        <p className="mt-2 text-sm text-slate-300">
                          Author:{" "}
                          {getProfileName(profileMap.get(getAuthorId(item.caption) ?? "") ?? {})}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                          Image ID: {getImageId(item.caption) ?? "Unknown"}
                        </p>
                      </div>
                      <div className="min-w-28 rounded-[1.2rem] border border-white/10 bg-white/5 p-3 text-right">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Net Score</p>
                        <p className="mt-1 text-3xl font-semibold text-white">{item.score.score}</p>
                        <p className="mt-2 text-xs text-slate-300">
                          {item.score.upvotes} up / {item.score.downvotes} down
                        </p>
                      </div>
                    </div>
                  </article>
                ) : null,
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-amber-100/65">Contributors</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Top caption producers</h3>

          <div className="mt-5 space-y-3">
            {topContributors.map((contributor, index) => {
              const profile = profileMap.get(contributor.id) ?? {};
              return (
                <div
                  className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-4 rounded-[1.4rem] border border-white/10 bg-slate-950/40 px-4 py-3"
                  key={contributor.id}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-300/15 text-sm font-semibold text-cyan-100">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{getProfileName(profile)}</p>
                    <p className="text-xs text-slate-400">{contributor.captions} captions submitted</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold text-white">{contributor.netScore}</p>
                    <p className="text-xs text-slate-400">{contributor.votes} total votes</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-100/65">Recent Motion</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Seven-day activity stream</h3>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {[freshImages, freshCaptions, freshVotes].map((series) => (
            <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/40 p-4" key={series.label}>
              <div className="flex items-center justify-between">
                <p className="text-lg font-medium text-white">{series.label}</p>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Last 7 Days</p>
              </div>

              <div className="mt-5 space-y-3">
                {series.points.map((point) => (
                  <div className="grid grid-cols-[70px_minmax(0,1fr)_32px] items-center gap-3" key={point.key}>
                    <p className="text-xs text-slate-400">{point.label}</p>
                    <div className="h-3 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-amber-200"
                        style={{ width: `${(point.count / series.max) * 100}%` }}
                      />
                    </div>
                    <p className="text-sm font-medium text-white">{point.count}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-amber-100/65">Image Coverage</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Fast visual context</h3>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {captionPerformance.slice(0, 4).map((item) => {
            const url = getCoverageImageUrl(item.caption, imageMap);

            return (
              <article className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-950/40" key={item.score.id}>
                {url ? (
                  <img alt="Caption context" className="h-44 w-full object-cover" src={url} />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-white/5 text-sm text-slate-400">
                    No image preview
                  </div>
                )}
                <div className="p-4">
                  <p className="line-clamp-3 text-sm text-white">{getCaptionText(item.caption) ?? "Caption unavailable"}</p>
                  <p className="mt-3 text-xs text-slate-400">
                    Score {item.score.score} • {item.score.upvotes} up / {item.score.downvotes} down
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
