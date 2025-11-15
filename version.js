// version.js
// Shared version selector for all ThreadJS docs pages.
//
// How to use in a page:
//  1) Include this file (preferably with `defer`):
//       <script src="version.js" defer></script>
//  2) Add a <select> and optional note span:
//       <select id="versionSelect"></select>
//       <span id="versionNote"></span>
//  3) Call initThreadJsVersionSelector({...}) after DOM is ready:
//       initThreadJsVersionSelector({
//         selectId: "versionSelect",
//         noteId: "versionNote",
//         pageKey: "api" | "inspector" | "examples"
//       });
//
// It will:
//  - Populate the dropdown with versions
//  - Detect the current version based on location.pathname
//  - Navigate to the same page in another version when changed

(function () {
  // --- Configure all documentation versions here ---

  // Each entry has:
  //  id   : internal identifier
  //  label: shown in the dropdown
  //  note : small text under/next to dropdown
  //  pages: mapping for each docs page type
  //         (all are relative URLs so they work on GitHub Pages)
  const VERSION_CONFIG = [
    {
      id: "main",
      label: "main (latest)",
      note: "Tracking the latest code on the main branch.",
      pages: {
        api: "index.html",
        inspector: "inspector.html",
        examples: "example-mods.html",
      },
    },
    {
      id: "v1.0.0",
      label: "v1.0.0",
      note: "Snapshot of the API for ThreadJS v1.0.0.",
      pages: {
        api: "v1.0.0/index.html",
        inspector: "v1.0.0/inspector.html",
        examples: "v1.0.0/example-mods.html",
      },
    },
    // Add more versions like:
    // {
    //   id: "v1.1.0",
    //   label: "v1.1.0",
    //   note: "ThreadJS v1.1.0.",
    //   pages: {
    //     api: "v1.1.0/index.html",
    //     inspector: "v1.1.0/inspector.html",
    //     examples: "v1.1.0/example-mods.html",
    //   },
    // },
  ];

  /**
   * Initialize a version selector dropdown on the current page.
   *
   * @param {Object} options
   * @param {string} options.selectId - id of the <select> element
   * @param {string} [options.noteId] - id of an element for the note (optional)
   * @param {("api"|"inspector"|"examples")} options.pageKey - which page type this is
   */
  function initThreadJsVersionSelector(options) {
    if (!options || !options.selectId || !options.pageKey) {
      console.warn("[ThreadJS] initThreadJsVersionSelector: missing options");
      return;
    }

    var select = document.getElementById(options.selectId);
    if (!select) {
      console.warn("[ThreadJS] version select element not found:", options.selectId);
      return;
    }

    var noteEl = null;
    if (options.noteId) {
      noteEl = document.getElementById(options.noteId) || null;
    }

    var pageKey = options.pageKey;
    var currentPath = window.location.pathname.replace(/\/+$/, ""); // strip trailing slash

    // Populate options and try to detect which version we're on.
    var currentIndex = 0;

    VERSION_CONFIG.forEach(function (v, idx) {
      var pageHref = v.pages && v.pages[pageKey];
      if (!pageHref) {
        return;
      }

      var opt = document.createElement("option");
      opt.value = v.id;
      opt.textContent = v.label;
      select.appendChild(opt);

      // normalize version page path for comparison
      var hrefPath = ("/" + pageHref).replace(/\/+$/, "");

      if (currentPath.endsWith(hrefPath)) {
        currentIndex = idx;
      }
    });

    // If nothing matched (e.g. custom path), keep default index 0.
    select.selectedIndex = currentIndex;

    var currentVersion = VERSION_CONFIG[currentIndex];
    if (noteEl && currentVersion && currentVersion.note) {
      noteEl.textContent = currentVersion.note;
    }

    select.addEventListener("change", function () {
      var selectedId = select.value;
      var version = VERSION_CONFIG.find(function (v) {
        return v.id === selectedId;
      });
      if (!version || !version.pages || !version.pages[pageKey]) {
        return;
      }
      var target = version.pages[pageKey];

      // Use relative navigation so it respects GitHub Pages base path.
      window.location.href = target;
    });
  }

  // Expose config & initializer on a namespaced global for other scripts.
  window.ThreadJsVersions = {
    config: VERSION_CONFIG.slice(), // shallow copy (read-only)
    init: initThreadJsVersionSelector,
  };
})();
