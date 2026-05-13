const fs = require('fs');
const path = require('path');

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_USER = process.env.LASTFM_USER;

if (!LASTFM_API_KEY || !LASTFM_USER) {
  console.error("Missing LASTFM_API_KEY or LASTFM_USER environment variables.");
  process.exit(1);
}

const API_BASE = "http://ws.audioscrobbler.com/2.0/";

async function fetchLastFmData(method, extraParams = {}) {
  const url = new URL(API_BASE);
  url.searchParams.append("method", method);
  url.searchParams.append("user", LASTFM_USER);
  url.searchParams.append("api_key", LASTFM_API_KEY);
  url.searchParams.append("format", "json");

  for (const [key, value] of Object.entries(extraParams)) {
    url.searchParams.append(key, value);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch ${method}: ${response.statusText}`);
  }
  return response.json();
}

async function updateReadme() {
  try {
    console.log("Fetching Last.fm data...");

    // 1. Total Scrobbles
    const userInfo = await fetchLastFmData("user.getInfo");
    const playcount = userInfo.user.playcount;

    // 2. Top Artist (7day)
    const topArtists = await fetchLastFmData("user.gettopartists", { period: "7day", limit: 1 });
    const topArtist = topArtists.topartists.artist[0];
    const artistName = topArtist ? topArtist.name : "None";
    const artistPlaycount = topArtist ? topArtist.playcount : 0;

    // 3. Top Album (7day)
    const topAlbums = await fetchLastFmData("user.gettopalbums", { period: "7day", limit: 1 });
    const topAlbum = topAlbums.topalbums.album[0];
    const albumName = topAlbum ? topAlbum.name : "None";
    const albumArtist = topAlbum ? topAlbum.artist.name : "None";
    const albumPlaycount = topAlbum ? topAlbum.playcount : 0;
    
    // Attempt to get album image if available
    let albumImageUrl = "";
    if (topAlbum && topAlbum.image) {
      const img = topAlbum.image.find(i => i.size === "extralarge" || i.size === "large");
      if (img && img["#text"]) {
        albumImageUrl = img["#text"];
      }
    }

    console.log("Data fetched successfully.");

    // Generate Markdown
    const markdownTemplate = `
<table>
  <tr>
    <td align="center" width="200">
      <img src="https://upload.wikimedia.org/wikipedia/commons/d/d4/Lastfm_logo.svg" width="100" alt="Last.fm" /><br><br>
      <b>🎶 Total Scrobbles</b><br>
      ${Number(playcount).toLocaleString('pt-BR')}
    </td>
    <td align="center" width="250">
      <b>🎤 Top Artist (Weekly)</b><br>
      ${artistName}<br>
      <i>${artistPlaycount} scrobbles</i>
    </td>
    <td align="center" width="250">
      <b>💿 Top Album (Weekly)</b><br>
      ${albumImageUrl ? `<img src="${albumImageUrl}" width="80" style="border-radius:10px;" /><br>` : ''}
      ${albumName}<br>
      by <i>${albumArtist}</i><br>
      <i>${albumPlaycount} scrobbles</i>
    </td>
  </tr>
</table>
`;

    const readmePath = path.join(process.cwd(), "README.md");
    let readmeContent = fs.readFileSync(readmePath, "utf-8");

    const startMarker = "<!-- LASTFM_START -->";
    const endMarker = "<!-- LASTFM_END -->";

    const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, "m");
    const replacement = `${startMarker}\n${markdownTemplate.trim()}\n${endMarker}`;

    readmeContent = readmeContent.replace(regex, replacement);

    fs.writeFileSync(readmePath, readmeContent);
    console.log("README.md updated successfully.");

  } catch (error) {
    console.error("Error updating README.md:", error);
    process.exit(1);
  }
}

updateReadme();
