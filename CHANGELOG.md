### Version 0.12.0
#### Features
- DBL dot local handles downloads for licensed and open access entries
- DBL dot local can be fed parameter for where to locate the config.xml
- Added Workspaces (so access tokens can have their own set of bundles, esp helpful for users who have roles on multiple organizations)
- Don't offer workspace login button until user has saved Settings
- Provide a button to Login to Unknown workspace if DBL dot local service is already running
- Added a workspace Settings form to configure config.xml (host, access tokens, organization type, open access)
- For entries list, added bottom status bar showing download queue and number of entries vs. filtered
- Display rightsholders and license info in columns
- Blue colored drafts indicate a new entry, red colored indicate revision.
- Added "Save as (New)" Button to copy metadata into another entry
- Rename former "Save As" button to "Export To"
- Link in the Resources dialog for users to Go Fix canon spec components now opens the relevant section in metadata to edit
- Auto-run best publication wizard whenever user changes the canon spec components 
- Added asterick (*) labels to help identify which sections in metadata are required
- display error message if "DblAppException" happens in context of login
- DBL dot local now shows all its activity in the log
- Added badge for Edit button to show errors that need to be fixed in metadata
- Show all errors in metadata
- Allow user to step through metadata sections with errors
- Added more human readable errors
- Kill spawned dbl_dot_local process on logout

#### Fixes
- DBL dot local no longer hangs (e.g. when adding resources)

### Version 0.10.0
#### Features
- Create new bundles (audio, video, print, text, braille)
- Add resources by File or Folder
- Add multiple canon spec components

### Version 0.9.2
#### Fixes
- Fixed `dbl_dot_local.exe` hang after (200kb) maxBuffer is reached for unused stdin and stdout pipes.

### Version 0.9.1
#### Fixes
- 'spawn' `dbl_dot_local.exe` so that it doesn't terminate after maxBuffer is reached.

### Version 0.9.0

#### Features
- signed nathanael installer with Windows security certificate
- run `dbl_dot_local.exe` as sub-process of nathanael (closes on exit)
- `File > Import config.xml` (& exit) for `dbl_dot_local.exe`
- `File > Export config.xml`

##### Bundle Rows
- Added user's name to app bar
- Only list latest revision (or draft), ordered by language code/country then by name
- Added [**Rev**] button to open DBL entry page
- Added [**Revise**] button to create `Draft`
- Added [**Edit**] button to edit metadata
- Added [**Delete**] button to delete `Draft`
- Added 'Stored' n-file count to show n-files downloaded
- Added [**Upload**] button for
##### Edit Metadata
- Show metadata forms in terms of collapsible/expandable tree
- Added [**Review**] button to show latest state of metadata.xml
- Added [**Save**]/[**Undo**] buttons when editing metadata
- Show errors in tree when trying to save invalid metadata
- Added [**Delete**] for factory instance forms
- Automatically cleanup/delete bundles that are not the latest revision (and have no resources downloaded)

#### Fixes
- Better performance when loading stored status on rows

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