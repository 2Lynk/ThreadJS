// version.js
// Dynamic version selector for ThreadJS docs.
//
// Convention:
//   - Place versioned OpenAPI specs in /versions, e.g.
//       versions/v1.0.0.yaml
//       versions/v1.1.0.yaml
//   - Filenames should look like vX.Y.Z.yaml or vX.Y.Z.yml
//
// Usage in a page (e.g. index.html):
//   1) Include this file:
//        <script src="version.js"></script>
//   2) Add selector + (optional) note element:
//        <select id="versionSelectApi"></select>
//        <span id="versionNoteApi"></span>
//   3) In your script, call:
//
//      if (window.ThreadJsVersion && window.ThreadJsVersion.initSelector) {
//        ThreadJsVersion.initSelector({
//          selectId: "versionSelectApi",
//          noteId: "versionNoteApi",
//          onReady(entry) {
//            // entry.yamlPath is the spec URL to load
//            bootRedoc(entry.yamlPath);
//          },
//          onChange(entry) {
//            bootRedoc(entry.yamlPath);
//          }
//        });
//      }
//
// The first time, it will default to the highest semantic version it finds.
// Afterwards, it remembers the last chosen version in localStorage.

(function () {
  const GITHUB_OWNER = "2Lynk";
  const GITHUB_REPO = "ThreadJS";
  const VERSIONS_DIR = "versions";

  /**
   * Extract version from filename like "v1.0.0.yaml" or "v1.0.1-nodes.yaml"
   * Returns the version string (e.g., "1.0.1") or null
   */
  function extractVersion(filename) {
    // Match patterns like: v1.0.0.yaml, v1.0.1-nodes.yaml, v2.3.4-variables.yml
    const match = /^v?(\d+\.\d+\.\d+)/.exec(filename);
    return match ? match[1] : null;
  }

  /**
   * Parse "v1.2.3" or "1.2.3" -> { major, minor, patch }
   * Returns null if it doesn't look like a semver string.
   */
  function parseSemver(versionId) {
    // Strip leading "v" if present
    const raw = versionId.replace(/^v/, "");
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(raw);
    if (!match) return null;
    return {
      major: Number(match[1]),
      minor: Number(match[2]),
      patch: Number(match[3]),
    };
  }

  /**
   * Compare two semver objects (a, b).
   * Returns -1 if a > b, 1 if a < b, 0 if equal.
   * (We want descending order, so higher version comes first.)
   */
  function compareSemverDesc(a, b) {
    if (a.major !== b.major) return a.major > b.major ? -1 : 1;
    if (a.minor !== b.minor) return a.minor > b.minor ? -1 : 1;
    if (a.patch !== b.patch) return a.patch > b.patch ? -1 : 1;
    return 0;
  }

  /**
   * Fetch version files from GitHub /contents API.
   * Returns a Promise<VersionEntry[]>, where each entry is:
   *   { id, label, yamlPath, semver }
   * 
   * @param {RegExp} [filePattern] - Optional regex to filter files (e.g., /^v[\d.]+\-variables\.(yaml|yml)$/)
   */
  async function loadVersionsFromGithub(filePattern) {
    const apiUrl =
      "https://api.github.com/repos/" +
      encodeURIComponent(GITHUB_OWNER) +
      "/" +
      encodeURIComponent(GITHUB_REPO) +
      "/contents/" +
      encodeURIComponent(VERSIONS_DIR);

    const res = await fetch(apiUrl);
    if (!res.ok) {
      throw new Error("GitHub API error " + res.status);
    }

    const items = await res.json();
    const versions = [];

    for (const item of items) {
      if (item.type !== "file") continue;
      const name = item.name || "";
      if (!/\.ya?ml$/i.test(name)) continue;
      
      // Apply optional file pattern filter
      if (filePattern && !filePattern.test(name)) continue;

      // Extract version number from filename (works with v1.0.0.yaml and v1.0.1-nodes.yaml)
      const versionStr = extractVersion(name);
      const label = name.replace(/\.ya?ml$/i, ""); // e.g. "v1.0.0" or "v1.0.1-nodes"
      const semver = versionStr ? parseSemver(versionStr) : null;

      versions.push({
        id: label,                  // "v1.0.0" or "v1.0.1-nodes"
        version: versionStr,        // "1.0.1" (for display)
        label: label,               // displayed in dropdown
        yamlPath: VERSIONS_DIR + "/" + name,  // e.g. "versions/v1.0.0.yaml"
        semver: semver,             // parsed semver or null
      });
    }

    // Sort: semver entries first, descending; then non-semver by label
    const semverEntries = versions.filter((v) => v.semver);
    const otherEntries = versions.filter((v) => !v.semver);

    semverEntries.sort((a, b) => compareSemverDesc(a.semver, b.semver));
    otherEntries.sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));

    return semverEntries.concat(otherEntries);
  }

  function readStoredVersionId(storageKey) {
    try {
      return localStorage.getItem(storageKey) || null;
    } catch {
      return null;
    }
  }

  function storeVersionId(storageKey, id) {
    try {
      localStorage.setItem(storageKey, id);
    } catch {
      /* ignore */
    }
  }

  /**
   * Initialize a version selector dropdown.
   *
   * options:
   *   - selectId:  id of <select>
   *   - noteId:    id of an optional element to show a small note (optional)
   *   - filePattern: optional RegExp to filter which files to load (e.g., /^v[\d.]+\-variables\.(yaml|yml)$/)
   *   - onReady(entry): called once initial version is chosen
   *   - onChange(entry): called on user change
   *
   * VersionEntry:
   *   { id, label, yamlPath, semver }
   */
  function initSelector(options) {
    if (!options || !options.selectId) {
      console.warn("[ThreadJS] initSelector: missing selectId");
      return;
    }

    const select = document.getElementById(options.selectId);
    if (!select) {
      console.warn("[ThreadJS] version select element not found:", options.selectId);
      return;
    }

    const noteEl = options.noteId
      ? document.getElementById(options.noteId) || null
      : null;

    // Create unique storage key for this selector
    const storageKey = "threadjs-version-" + options.selectId;

    loadVersionsFromGithub(options.filePattern)
      .then((versions) => {
        if (!versions.length) {
          console.warn("[ThreadJS] No version YAMLs found in /versions");
          // Fallback: hide selector, no versions
          select.style.display = "none";
          if (noteEl) {
            noteEl.textContent = "No versioned specs found.";
          }
          return;
        }

        // Build options
        select.innerHTML = "";
        versions.forEach((v) => {
          const opt = document.createElement("option");
          opt.value = v.id;
          opt.textContent = v.label;
          select.appendChild(opt);
        });

        // Decide default:
        //  - If we have a stored version and it exists, use that
        //  - Otherwise, use the first entry (which is highest semver)
        let selectedEntry = versions[0];
        const storedId = readStoredVersionId(storageKey);
        if (storedId) {
          const found = versions.find((v) => v.id === storedId);
          if (found) selectedEntry = found;
        }

        select.value = selectedEntry.id;
        if (noteEl) {
          noteEl.textContent =
            "Using spec: " + selectedEntry.yamlPath + " (default = highest version when first visited)";
        }

        if (typeof options.onReady === "function") {
          options.onReady(selectedEntry);
        }

        select.addEventListener("change", () => {
          const id = select.value;
          const entry = versions.find((v) => v.id === id);
          if (!entry) return;

          storeVersionId(storageKey, entry.id);

          if (noteEl) {
            noteEl.textContent = "Using spec: " + entry.yamlPath;
          }

          if (typeof options.onChange === "function") {
            options.onChange(entry);
          }
        });
      })
      .catch((err) => {
        console.error("[ThreadJS] Failed to load versions:", err);
        // Fallback: hide selector / show error
        select.style.display = "none";
        if (noteEl) {
          noteEl.textContent = "Failed to load version list.";
        }
      });
  }

  window.ThreadJsVersion = {
    initSelector,
    // Expose loader as well, in case you ever want to use it manually
    loadVersions: loadVersionsFromGithub,
  };
})();
