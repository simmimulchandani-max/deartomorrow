import { createClient } from "@supabase/supabase-js";

const publicBucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "dear-tomorrow";
const privateBucket = process.env.SUPABASE_PRIVATE_MEDIA_BUCKET || "dear-tomorrow-private";
const pageSize = 100;
const dryRun = process.argv.includes("--dry-run");
const deletePublic = process.argv.includes("--delete-public");

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function legacyPath(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const marker = `/storage/v1/object/public/${publicBucket}/`;
    const index = url.pathname.indexOf(marker);
    return index === -1 ? null : decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

async function ensurePrivateCopy(path) {
  const slash = path.lastIndexOf("/");
  const folder = slash === -1 ? "" : path.slice(0, slash);
  const name = slash === -1 ? path : path.slice(slash + 1);
  const { data: existing, error: listError } = await supabase.storage.from(privateBucket).list(folder, { limit: 1000 });
  if (listError) throw new Error(`Could not inspect private ${path}: ${listError.message}`);
  if ((existing ?? []).some((item) => item.name === name)) return;

  if (dryRun) return;
  const { data: file, error: downloadError } = await supabase.storage.from(publicBucket).download(path);
  if (downloadError || !file) throw new Error(`Could not read public ${path}: ${downloadError?.message}`);
  const { error: uploadError } = await supabase.storage
    .from(privateBucket)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (uploadError) throw new Error(`Could not write private ${path}: ${uploadError.message}`);
}

async function migrateTable(table) {
  let from = 0;
  let migrated = 0;

  while (true) {
    const { data: rows, error } = await supabase
      .from(table)
      .select("id, media_url, media_urls")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!rows?.length) break;

    for (const row of rows) {
      const references = Array.isArray(row.media_urls)
        ? row.media_urls.filter((value) => typeof value === "string")
        : row.media_url
          ? [row.media_url]
          : [];
      const legacyReferences = references.map(legacyPath).filter(Boolean);
      const privateReferences = references.filter((value) => !legacyPath(value) && !value.includes("://"));
      if (!legacyReferences.length && !deletePublic) continue;

      for (const path of [...legacyReferences, ...privateReferences]) await ensurePrivateCopy(path);
      const migratedUrls = references.map((value) => legacyPath(value) || value);
      const migratedUrl = typeof row.media_url === "string" ? legacyPath(row.media_url) || row.media_url : null;

      if (!dryRun && legacyReferences.length) {
        const { error: updateError } = await supabase
          .from(table)
          .update({ media_url: migratedUrl, media_urls: migratedUrls })
          .eq("id", row.id);
        if (updateError) throw new Error(`${table} ${row.id}: ${updateError.message}`);
      }

      if (deletePublic && !dryRun) {
        const { error: removeError } = await supabase.storage
          .from(publicBucket)
          .remove([...legacyReferences, ...privateReferences]);
        if (removeError) throw new Error(`${table} ${row.id}: failed removing public copies: ${removeError.message}`);
      }
      migrated += 1;
      console.log(`${dryRun ? "Would migrate" : "Migrated"} ${table}/${row.id}`);
    }

    from += rows.length;
  }

  return migrated;
}

console.log(`Migrating ${publicBucket} -> ${privateBucket}${dryRun ? " (dry run)" : ""}`);
const memories = await migrateTable("memories");
const capsuleMemories = await migrateTable("capsule_memories");
console.log(`Complete: ${memories} memories, ${capsuleMemories} capsule memories.`);
