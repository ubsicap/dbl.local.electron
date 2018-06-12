### Version 0.8.0

#### Features
- add language and country code column (and sort first by it)

### Version 0.7.3

#### Fixes
- fix production build errors "TypeError: Assignment to constant variable." 
- disabled regex search (to allow quoting anything)

### Version 0.7.2
- add version number to Nathanael app title

#### Fixes
- don't close SSE channel for errors. (Just log them).
- fix apply search to progress update text
- fix search bug
- fix unresponsive UI due to search
- don't erase spaces from user search input
- fix status based on mode and downloaded resources vs. manifest
- added code to determine whether to update highlighting

### Version 0.7.1

#### Fixes
- Fix status (e.g. downloading) while loading & sorting other rows.
- Fix File > Bundles (demo)

### Version 0.7.0

#### Features
- Added AppMenuBar with Search box always visible at top when scrolling
- Added Media icons (text, audio, video, print)

### Version 0.6.1

#### Fixes
- fix Downloading message handling from latest dbl_dot_local

### Version 0.6.0

#### Features
- Add new entry rows after DBL dot Local discovers and downloads their metadata

#### Fixes
- Improved Search input performance
- Improved scroll bar performance when loading new entries
- Improved entry row selection (toggling tray menu)
- Filter out rows that are missing name (possibly loading_metadata)

### Version 0.5.0

#### Features
- Add Clean (Resources) tray button
- Sort revisions in descending order
- Add basic edit functions (Copy/Paste)

#### Fixes
- Fix downloaded status if user has used Clean
- Close eventSource on error or if making a new eventSource (due to login or switching page)
- Fix missing name from metadata.xml bug (a.k.a loading_metadata)

### Version 0.4.2

#### Fixes
- Fix download and Save To progess in production builds
- (for now) Sort bundles by name, so bundles don't unexpectedly change order when reopening Nathanael

### Version 0.4.0

#### Features
- Download from DBL
- Enable Click "Save To" folder
- Show Download and "Save To" Progress
- Parse history to determine if downloaded
- Enable Click Info (to open DBL entry in browser)
- Disable unused/invalid tray menu buttons

#### Fixes
- clear search on location change. feed searchInput from prop
- fix circular progress to happen on loading

### Version 0.3.0

#### Features

- Add highlighting to buttons!
- By default load bundles from dbl dot local api 
- Can access `File > Bundles (Demo)` for demo list  (w/o login)
- Changed "Completed" status to "Downloaded" or "Uploaded"
- Uses bundle history to determine status

#### Fixes
- Fixed operating system paths in `Help > Open Log`
- Styled top-right icons with more padding
- Styled wider login user/password
- Styled login loading animation margin
- Fix loading dev tools/menu on `did-finish-load` so dev tools do not cover up UI. 
- Fix context menu so `Inspect element` doesn't keep popping up by only loading dev tools first time menu is installed.

# 0.2.1

#### Features

- Added Open Log to the Help menu

#### Fixes

- Fix status column
- Fix highlighting to have zero padding (+ bolded)

# 0.2.0 

#### Features

- Search/Filter bundles and highlight matches

# 0.1.0 

#### Features

- File > Login
- File > Bundles (Demo) 
- Auto-update